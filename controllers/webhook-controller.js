const crypto  = require('crypto');
const Booking = require('../modals/booking-modals');
const { processPaymentSuccess } = require('../services/paymentService');

const MPGS_WEBHOOK_SECRET = process.env.MPGS_WEBHOOK_SECRET || '';

// ── Timing-safe HMAC-SHA256 signature check ──────────────────────────────────
const verifySignature = (rawBody, receivedSig) => {
    if (!MPGS_WEBHOOK_SECRET) {
        // Skip verification in sandbox when secret is not configured — log the gap
        console.warn('[Webhook] MPGS_WEBHOOK_SECRET not set — skipping signature check (sandbox mode).');
        return true;
    }
    const expected = crypto
        .createHmac('sha256', MPGS_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(receivedSig || ''));
    } catch {
        return false;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/webhooks/mpgs
// No auth middleware — MPGS posts here directly. Verified by HMAC signature.
// Must return 2xx for MPGS to stop retrying; return 5xx to trigger retry.
// ─────────────────────────────────────────────────────────────────────────────
const handleMpgsWebhook = async (req, res) => {
    try {
        // ── [1] Signature verification ────────────────────────────────────────
        const rawBody     = req.rawBody || JSON.stringify(req.body);
        const receivedSig = req.headers['x-notification-secret']
                         || req.headers['x-mpgs-signature']
                         || '';

        if (!verifySignature(rawBody, receivedSig)) {
            console.warn('[Webhook] Signature mismatch — request rejected.');
            return res.status(400).json({ success: false, message: 'Invalid signature.' });
        }

        const payload = req.body;

        // ── [2] Filter: only process CAPTURED / APPROVED payment events ───────
        const orderStatus = payload?.order?.status;
        const gwCode      = payload?.response?.gatewayCode;

        if (orderStatus !== 'CAPTURED' && gwCode !== 'APPROVED') {
            console.log(`[Webhook] Non-payment event (status: ${orderStatus}, gwCode: ${gwCode}). Acknowledged.`);
            return res.status(200).json({ received: true });
        }

        const orderId       = payload?.order?.id;
        const transactionId = payload?.transaction?.id;
        const rawAmount     = payload?.order?.amount?.value ?? payload?.order?.amount;

        if (!orderId || !transactionId) {
            console.error('[Webhook] Missing orderId or transactionId in payload.');
            return res.status(400).json({ success: false, message: 'Missing order/transaction ID.' });
        }

        // ── [3] Resolve booking from orderId ──────────────────────────────────
        const booking = await Booking.findOne({ orderId });
        if (!booking) {
            console.error(`[Webhook] No booking found for orderId: ${orderId}`);
            // Return 400 so MPGS does NOT keep retrying an unknown order
            return res.status(400).json({ success: false, message: 'Unknown order.' });
        }

        const amount = parseFloat(rawAmount) || booking.amount;

        // ── [4] Process payment (idempotent) ──────────────────────────────────
        const result = await processPaymentSuccess({
            bookingId:     booking._id,
            orderId,
            transactionId,
            amount,
            nurseId:       booking.caregiver,
            patientId:     booking.patient,
            paymentMethod: 'mastercard',
            rawPayload:    payload
        });

        if (result.alreadyProcessed) {
            console.log(`[Webhook] Duplicate delivery for orderId ${orderId} — safely acknowledged.`);
        } else {
            console.log(`[Webhook] Payment processed for orderId ${orderId} | amount: PKR ${amount}.`);
        }

        // Always 200 once logic completed — prevents MPGS infinite retry
        return res.status(200).json({ received: true });

    } catch (error) {
        console.error('[Webhook] Unhandled error:', error.message);
        // 500 signals MPGS to retry — correct for transient DB failures
        return res.status(500).json({ success: false, message: 'Server error. Retry expected.' });
    }
};

module.exports = { handleMpgsWebhook };
