const mongoose    = require('mongoose');
const Booking     = require('../modals/booking-modals');
const Wallet      = require('../modals/wallet-modal');
const Transaction = require('../modals/transaction-modal');
const Notification = require('../modals/notification-modal');
const AdminWallet = require('../modals/admin-wallet-modal');

/**
 * processPaymentSuccess — single source of truth for marking a payment complete.
 *
 * Called by:
 *   1. Webhook handler  (MPGS sends notification after live payment)
 *   2. initiatePayment  (simulation mode — triggered immediately after MPGS APPROVED)
 *
 * Idempotent: safe to call multiple times with the same orderId + transactionId.
 * All money movement (wallet credit + ledger write) is wrapped in a MongoDB session
 * so it is all-or-nothing.
 */
const processPaymentSuccess = async ({
    bookingId,
    orderId,
    transactionId,
    amount,
    nurseId,
    patientId,
    paymentMethod = 'card',
    rawPayload    = {}
}) => {
    const idempotencyKey = `${orderId}:${transactionId}`;

    // ── [1] Idempotency guard ────────────────────────────────────────────────
    const existing = await Transaction.findOne({ idempotencyKey });
    if (existing) {
        return { alreadyProcessed: true };
    }

    // ── [2] Atomic MongoDB transaction ───────────────────────────────────────
    // Sessions require a replica set. In standalone dev environments the session
    // is skipped; idempotency + conditional update still prevent double-payment.
    let session = null;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
    } catch {
        session = null;
    }

    const sessionOpt = session ? { session } : {};

    try {
        const platformFee  = 0; // legacy field kept for existing records
        const netAmount    = amount - platformFee;

        // 95 / 5 commission split
        const commission  = Math.round(amount * 0.05 * 100) / 100; // 5%  → admin
        const nurseAmount = Math.round(amount * 0.95 * 100) / 100; // 95% → nurse digital_balance

        // 2a. Mark booking paid — conditional update prevents race condition
        const updatedBooking = await Booking.findOneAndUpdate(
            { _id: bookingId, paymentStatus: 'pending' },
            {
                paymentStatus:             'paid',
                paymentMethod,
                transactionId,
                orderId,
                paymentWebhookReceivedAt:  new Date()
            },
            { ...sessionOpt, new: true }
        );

        if (!updatedBooking) {
            // Already paid or booking not found — safe to abort
            if (session) await session.abortTransaction();
            return { alreadyProcessed: true };
        }

        // 2b. Credit nurse wallet (upsert — creates wallet on first payment)
        //     availableBalance and digital_balance both receive 95% (nurseAmount)
        //     totalEarned tracks gross amount paid before deduction
        if (nurseId) {
            await Wallet.findOneAndUpdate(
                { nurse: nurseId },
                { $inc: { availableBalance: nurseAmount, totalEarned: netAmount, digital_balance: nurseAmount } },
                { upsert: true, ...sessionOpt, new: true }
            );
        }

        // 2c. Update admin commission wallet
        await AdminWallet.findOneAndUpdate(
            {},
            { $inc: { total_commission_collected: commission } },
            { upsert: true, ...sessionOpt, new: true }
        );

        // 2d. Write immutable ledger entries
        //     Entry 1 — nurse credit (95% net earnings)
        //     Entry 2 — admin credit (5% commission collected)
        const ledgerEntries = [
            {
                idempotencyKey,
                type:        'patient_payment',
                method:      paymentMethod,
                direction:   'credit',
                actor:       'NURSE',
                booking:     bookingId,
                patient:     patientId,
                nurse:       nurseId,
                grossAmount: amount,
                platformFee: commission,
                netAmount:   nurseAmount,
                status:      'completed',
                mpgs: {
                    orderId,
                    transactionId,
                    result:     'SUCCESS',
                    rawWebhook: rawPayload
                },
                processedAt: new Date()
            }
        ];

        if (nurseId) {
            ledgerEntries.push({
                idempotencyKey: `${idempotencyKey}:admin-credit`,
                type:           'patient_payment',
                method:         paymentMethod,
                direction:      'credit',
                actor:          'ADMIN',
                booking:        bookingId,
                patient:        patientId,
                nurse:          nurseId,
                grossAmount:    commission,
                platformFee:    0,
                netAmount:      commission,
                status:         'completed',
                processedAt:    new Date()
            });
        }

        await Transaction.create(ledgerEntries, { ...sessionOpt, ordered: true });

        if (session) await session.commitTransaction();

    } catch (err) {
        if (session) await session.abortTransaction();
        throw err;
    } finally {
        if (session) session.endSession();
    }

    // ── [3] Persist nurse notification (outside transaction) ─────────────────
    // Failure here must NOT roll back the payment — log and continue.
    try {
        await Notification.create({
            recipient: nurseId,
            type:      'payment_received',
            title:     'Payment Received',
            body:      `PKR ${nurseAmount.toFixed(2)} received for your service (PKR ${commission.toFixed(2)} App Charges deducted).`,
            data:      { bookingId, nurseAmount, commission, orderId, transactionId }
        });
    } catch (notifErr) {
        console.error('[PaymentService] Notification creation failed (non-critical):', notifErr.message);
    }

    return { success: true, idempotencyKey };
};

module.exports = { processPaymentSuccess };
