const crypto             = require('crypto');
const mongoose           = require('mongoose');
const axios              = require('axios');
const Wallet             = require('../modals/wallet-modal');
const Transaction        = require('../modals/transaction-modal');
const WithdrawalRequest  = require('../modals/withdrawal-modal');
const Notification       = require('../modals/notification-modal');
const AdminWallet        = require('../modals/admin-wallet-modal');
const { getAuthHeader }  = require('../utils/mastercardOAuth');

const MIN_WITHDRAWAL = parseFloat(process.env.MIN_WITHDRAWAL_PKR || '500');

// ── MPGS config (used for commission Mastercard payments) ──────────────────
const GATEWAY_URL  = process.env.MASTERCARD_GATEWAY_URL || 'https://test-akamai.gateway.mastercard.com';
const API_VERSION  = process.env.MASTERCARD_API_VERSION || '61';
const MERCHANT_ID  = process.env.MASTERCARD_MERCHANT_ID || '';
const API_PASSWORD = process.env.MASTERCARD_API_PASSWORD || '';

const isMpgsConfigured = () => !!(MERCHANT_ID && API_PASSWORD);

const buildBasicAuth = () => {
    const creds = Buffer.from(`merchant.${MERCHANT_ID}:${API_PASSWORD}`).toString('base64');
    return `Basic ${creds}`;
};

const signedRequest = async (method, url, body = null) => {
    const oauthHeader = getAuthHeader(url, method.toUpperCase(), body);
    const headers = {
        'Content-Type': 'application/json',
        'x-mastercard-consumer-key': process.env.MASTERCARD_CONSUMER_KEY
    };

    if (isMpgsConfigured()) {
        headers['Authorization'] = buildBasicAuth();
        headers['x-mastercard-authorization'] = oauthHeader;
    } else {
        headers['Authorization'] = oauthHeader;
    }

    const config = { headers, timeout: 30000 };
    return axios({ method: method.toLowerCase(), url, data: body || undefined, ...config });
};

const luhnCheck = (number) => {
    const cleaned = number.replace(/\D/g, '');
    let sum = 0, isEven = false;
    for (let i = cleaned.length - 1; i >= 0; i--) {
        let d = parseInt(cleaned[i], 10);
        if (isEven) { d *= 2; if (d > 9) d -= 9; }
        sum += d; isEven = !isEven;
    }
    return sum % 10 === 0;
};

const isMastercardNumber = (num) => /^5[1-5]/.test(num) || /^2[2-7]/.test(num);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallet
// ─────────────────────────────────────────────────────────────────────────────
const getWallet = async (req, res, next) => {
    try {
        const nurseId = req.user._id;
        const wallet  = await Wallet.findOne({ nurse: nurseId });

        const [cashEarned, cashSettled] = await Promise.all([
            Transaction.aggregate([
                { $match: { type: 'cash_record', method: 'cash', nurse: nurseId } },
                { $group: { _id: null, total: { $sum: '$platformFee' } } }
            ]),
            Transaction.aggregate([
                {
                    $match: {
                        type: 'commission_payment',
                        nurse: nurseId,
                        $or: [{ booking: { $exists: false } }, { booking: null }]
                    }
                },
                { $group: { _id: null, total: { $sum: '$netAmount' } } }
            ])
        ]);

        const pendingRaw = (cashEarned[0]?.total || 0) - (cashSettled[0]?.total || 0);
        const payableCommission = Math.max(0, Math.round(pendingRaw * 100) / 100);

        return res.status(200).json({
            success: true,
            wallet: wallet
                ? { ...wallet.toObject(), payable_commission: payableCommission }
                : {
                    availableBalance:   0,
                    pendingBalance:     0,
                    totalEarned:        0,
                    totalWithdrawn:     0,
                    digital_balance:    0,
                    payable_commission: payableCommission,
                    currency:           'PKR'
                }
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallet/transactions?page=1&limit=20&type=payment
// ─────────────────────────────────────────────────────────────────────────────
const getTransactions = async (req, res, next) => {
    try {
        const nurseId = req.user._id;
        const page    = Math.max(1, parseInt(req.query.page)  || 1);
        const limit   = Math.min(50, parseInt(req.query.limit) || 20);
        const type    = req.query.type;
        const skip    = (page - 1) * limit;

        const filter = { nurse: nurseId };
        if (type && ['payment', 'withdrawal', 'refund'].includes(type)) {
            filter.type = type;
        }

        const [transactions, total] = await Promise.all([
            Transaction.find(filter)
                .populate('booking', 'serviceType date amount')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Transaction.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            transactions,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallet/withdraw
// Body: { amount: Number, bankDetails: { accountTitle, accountNumber, bankName, branchCode } }
// ─────────────────────────────────────────────────────────────────────────────
const requestWithdrawal = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const nurseId     = req.user._id;
        const { amount, bankDetails } = req.body;

        // ── [1] Input validation ──────────────────────────────────────────────
        if (!amount || isNaN(amount) || amount < MIN_WITHDRAWAL) {
            return res.status(400).json({
                success: false,
                message: `Minimum withdrawal amount is PKR ${MIN_WITHDRAWAL}.`
            });
        }
        if (!bankDetails?.accountTitle || !bankDetails?.accountNumber || !bankDetails?.bankName) {
            return res.status(400).json({
                success: false,
                message: 'bankDetails requires accountTitle, accountNumber, and bankName.'
            });
        }

        // ── [2] Atomic debit with overdraft guard ─────────────────────────────
        const wallet = await Wallet.findOneAndUpdate(
            { nurse: nurseId, availableBalance: { $gte: amount } },
            { $inc: { availableBalance: -amount, totalWithdrawn: amount } },
            { session, new: true }
        );

        if (!wallet) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance or wallet not found.'
            });
        }

        // ── [3] Store masked account number only ──────────────────────────────
        const maskedAccount = `****${String(bankDetails.accountNumber).slice(-4)}`;

        // ── [4] Create withdrawal record ──────────────────────────────────────
        const [withdrawal] = await WithdrawalRequest.create([{
            nurse:  nurseId,
            wallet: wallet._id,
            amount,
            status: 'processing',
            bankDetails: {
                accountTitle:  bankDetails.accountTitle,
                accountNumber: maskedAccount,
                bankName:      bankDetails.bankName,
                branchCode:    bankDetails.branchCode || ''
            },
            requestedAt: new Date()
        }], { session });

        // ── [5] Write ledger entry ────────────────────────────────────────────
        await Transaction.create([{
            idempotencyKey: `withdrawal:${withdrawal._id}`,
            type:           'withdrawal',
            direction:      'debit',
            nurse:          nurseId,
            grossAmount:    amount,
            platformFee:    0,
            netAmount:      amount,
            status:         'completed',
            withdrawalId:   withdrawal._id,
            processedAt:    new Date()
        }], { session });

        await session.commitTransaction();

        // ── [6] Sandbox simulation (outside transaction) ──────────────────────
        simulateBankTransfer(withdrawal._id, nurseId, amount).catch(err =>
            console.error('[Wallet] Sandbox simulation error:', err.message)
        );

        return res.status(202).json({
            success: true,
            message:    'Withdrawal request received. Processing...',
            withdrawal: {
                _id:                 withdrawal._id,
                amount,
                status:              'processing',
                maskedAccount,
                bankName:            bankDetails.bankName,
                estimatedCompletion: '~3 seconds (sandbox)'
            },
            newBalance: wallet.availableBalance
        });

    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

// Simulates the bank transfer completing asynchronously
const simulateBankTransfer = async (withdrawalId, nurseId, amount) => {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const sandboxReference = `SBX-${crypto.randomUUID().toUpperCase().slice(0, 12)}`;

    await WithdrawalRequest.findByIdAndUpdate(withdrawalId, {
        status:           'completed',
        sandboxReference,
        processedAt:      new Date()
    });

    await Notification.create({
        recipient: nurseId,
        type:      'withdrawal_processed',
        title:     'Withdrawal Processed',
        body:      `PKR ${Number(amount).toFixed(2)} has been transferred to your bank account.`,
        data:      { withdrawalId, amount, sandboxReference }
    });

    console.log(`[Wallet] Withdrawal ${withdrawalId} completed. Ref: ${sandboxReference}`);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallet/withdrawals?page=1&limit=20
// ─────────────────────────────────────────────────────────────────────────────
const getWithdrawals = async (req, res, next) => {
    try {
        const nurseId = req.user._id;
        const page    = Math.max(1, parseInt(req.query.page)  || 1);
        const limit   = Math.min(50, parseInt(req.query.limit) || 20);
        const skip    = (page - 1) * limit;

        const [withdrawals, total] = await Promise.all([
            WithdrawalRequest.find({ nurse: nurseId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            WithdrawalRequest.countDocuments({ nurse: nurseId })
        ]);

        return res.status(200).json({
            success: true,
            withdrawals,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallet/notifications?page=1&limit=20
// ─────────────────────────────────────────────────────────────────────────────
const getNotifications = async (req, res, next) => {
    try {
        const userId  = req.user._id;
        const page    = Math.max(1, parseInt(req.query.page)  || 1);
        const limit   = Math.min(50, parseInt(req.query.limit) || 20);
        const skip    = (page - 1) * limit;

        const [notifications, unreadCount] = await Promise.all([
            Notification.find({ recipient: userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Notification.countDocuments({ recipient: userId, isRead: false })
        ]);

        return res.status(200).json({ success: true, notifications, unreadCount });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/wallet/notifications/read  — mark all as read
// ─────────────────────────────────────────────────────────────────────────────
const markNotificationsRead = async (req, res, next) => {
    try {
        const userId = req.user._id;
        await Notification.updateMany(
            { recipient: userId, isRead: false },
            { isRead: true, readAt: new Date() }
        );
        return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallet/withdraw-jazzcash
// Body: { phoneNumber: String, amount: Number }
// Withdraws the requested amount from digital_balance (no commission deduction —
// commission settlement is a separate flow via POST /wallet/pay-commission).
// ─────────────────────────────────────────────────────────────────────────────
const requestJazzCashWithdrawal = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const nurseId = req.user._id;
        const { phoneNumber, amount } = req.body;

        if (!phoneNumber) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'phoneNumber is required.' });
        }

        const withdrawAmount = Math.round(parseFloat(amount) * 100) / 100;
        if (!withdrawAmount || isNaN(withdrawAmount) || withdrawAmount <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'A valid withdrawal amount is required.' });
        }

        const wallet = await Wallet.findOne({ nurse: nurseId }).session(session);

        if (!wallet || wallet.digital_balance < withdrawAmount) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: wallet
                    ? `Insufficient balance. Available: PKR ${(wallet.digital_balance || 0).toFixed(2)}`
                    : 'No wallet found.'
            });
        }

        await Wallet.findOneAndUpdate(
            { nurse: nurseId },
            { $inc: { digital_balance: -withdrawAmount, totalWithdrawn: withdrawAmount } },
            { session }
        );

        const idempotencyKey = `jazzcash-withdraw:${nurseId}:${Date.now()}`;
        await Transaction.create([{
            idempotencyKey,
            type:        'withdrawal',
            method:      'jazzcash',
            direction:   'debit',
            nurse:       nurseId,
            grossAmount: withdrawAmount,
            platformFee: 0,
            netAmount:   withdrawAmount,
            status:      'completed',
            processedAt: new Date()
        }], { session });

        await session.commitTransaction();

        Notification.create({
            recipient: nurseId,
            type:      'withdrawal_processed',
            title:     'JazzCash Withdrawal Processed',
            body:      `PKR ${withdrawAmount.toFixed(2)} sent to JazzCash ${phoneNumber}.`,
            data:      { withdrawAmount, phoneNumber }
        }).catch(err => console.error('[JazzCash] Notification error:', err.message));

        return res.status(200).json({
            success: true,
            message: `PKR ${withdrawAmount.toFixed(2)} withdrawn to JazzCash ${phoneNumber} (sandbox).`,
            withdrawAmount,
            phoneNumber
        });

    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallet/pay-commission
// Body: { method: 'jazzcash' | 'mastercard' }
// ─────────────────────────────────────────────────────────────────────────────
const payCommission = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const nurseId = req.user._id;
        const { method, cardNumber, expiryMonth, expiryYear, cvv, cardholderName } = req.body;

        if (!method || !['jazzcash', 'mastercard'].includes(method)) {
            return res.status(400).json({ success: false, message: 'method must be jazzcash or mastercard.' });
        }

        const [cashEarned, cashSettled] = await Promise.all([
            Transaction.aggregate([
                { $match: { type: 'cash_record', method: 'cash', nurse: nurseId } },
                { $group: { _id: null, total: { $sum: '$platformFee' } } }
            ]).session(session),
            Transaction.aggregate([
                {
                    $match: {
                        type: 'commission_payment',
                        nurse: nurseId,
                        $or: [{ booking: { $exists: false } }, { booking: null }]
                    }
                },
                { $group: { _id: null, total: { $sum: '$netAmount' } } }
            ]).session(session)
        ]);

        const pendingRaw = (cashEarned[0]?.total || 0) - (cashSettled[0]?.total || 0);
        const amount = Math.round(pendingRaw * 100) / 100;

        if (!amount || amount <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'No payable commission to settle.' });
        }

        if (method === 'mastercard') {
            if (!cardNumber || !expiryMonth || !expiryYear || !cvv || !cardholderName) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: 'All card fields are required.' });
            }

            const cleanCard = String(cardNumber).replace(/\s/g, '');
            if (!isMastercardNumber(cleanCard) || !luhnCheck(cleanCard)) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: 'Only valid Mastercard numbers are accepted.' });
            }
            if (String(cvv).length < 3 || String(cvv).length > 4) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: 'Invalid CVV.' });
            }

            if (isMpgsConfigured()) {
                const orderId = `COMM-${String(nurseId).slice(-8).toUpperCase()}-${Date.now()}`;
                const txnId   = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

                try {
                    const sessionUrl  = `${GATEWAY_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/session`;
                    const sessionBody = { apiOperation: 'CREATE_SESSION', interaction: { operation: 'PURCHASE' } };
                    const sessionRes  = await signedRequest('POST', sessionUrl, sessionBody);
                    const sessionId   = sessionRes.data?.session?.id;

                    if (!sessionId) throw new Error('No session ID returned from MPGS.');

                    const updateUrl  = `${GATEWAY_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/session/${sessionId}`;
                    const updateBody = {
                        sourceOfFunds: {
                            provided: {
                                card: {
                                    number: cleanCard,
                                    expiry: { month: expiryMonth, year: String(expiryYear).slice(-2) },
                                    securityCode: cvv
                                }
                            },
                            type: 'CARD'
                        },
                        order: {
                            id: orderId,
                            amount: amount.toFixed(2),
                            currency: 'PKR',
                            description: 'Nursify - Commission Payment'
                        },
                        billing: { address: { name: String(cardholderName).trim() } }
                    };
                    await signedRequest('PUT', updateUrl, updateBody);

                    const payUrl  = `${GATEWAY_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${txnId}`;
                    const payBody = {
                        apiOperation: 'PAY',
                        session: { id: sessionId },
                        order: {
                            id: orderId,
                            amount: amount.toFixed(2),
                            currency: 'PKR',
                            description: 'Nursify - Commission Payment'
                        },
                        transaction: { id: txnId }
                    };
                    const payRes = await signedRequest('PUT', payUrl, payBody);
                    const gwCode = payRes.data?.response?.gatewayCode;

                    if (gwCode !== 'APPROVED') {
                        await session.abortTransaction();
                        return res.status(402).json({
                            success: false,
                            message: payRes.data?.response?.gatewayRecommendation || 'Card payment declined.',
                            gatewayCode: gwCode
                        });
                    }
                } catch (mpgsErr) {
                    await session.abortTransaction();
                    if (mpgsErr.response?.data) {
                        return res.status(502).json({
                            success: false,
                            message: 'Payment gateway error. Please try again.',
                            detail: mpgsErr.response.data?.error?.explanation || 'Gateway unreachable'
                        });
                    }
                    return res.status(500).json({ success: false, message: mpgsErr.message });
                }
            }
        }

        const cashEarnedTotal  = Math.round((cashEarned[0]?.total || 0) * 100) / 100;
        const cashSettledTotal = Math.round((cashSettled[0]?.total || 0) * 100) / 100;
        const idempotencyKey = `commission-pay:${nurseId}:${cashEarnedTotal.toFixed(2)}:${cashSettledTotal.toFixed(2)}`;
        const existing = await Transaction.findOne({ idempotencyKey }).session(session);
        if (existing) {
            await session.abortTransaction();
            const remaining = Math.max(0, Math.round((pendingRaw - amount) * 100) / 100);
            return res.status(200).json({
                success: true,
                message: 'Commission already settled.',
                amount,
                method,
                payable_commission: remaining
            });
        }

        const wallet = await Wallet.findOne({ nurse: nurseId }).session(session);

        if (!wallet) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'No wallet found.' });
        }

        if (wallet.availableBalance < amount || wallet.digital_balance < amount) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Insufficient wallet balance. Required: PKR ${amount.toFixed(2)}`
            });
        }

        const updatedWallet = await Wallet.findOneAndUpdate(
            {
                nurse: nurseId,
                availableBalance: { $gte: amount },
                digital_balance:  { $gte: amount }
            },
            { $inc: { availableBalance: -amount, digital_balance: -amount } },
            { session, new: true }
        );

        if (!updatedWallet) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Insufficient wallet balance. Required: PKR ${amount.toFixed(2)}`
            });
        }

        await AdminWallet.findOneAndUpdate(
            {},
            {
                $inc: {
                    total_commission_collected: amount,
                    total_commission_pending:  -amount
                }
            },
            { upsert: true, session }
        );

        await Transaction.create([{
            idempotencyKey,
            type:        'commission_payment',
            method,
            direction:   'debit',
            nurse:       nurseId,
            grossAmount: amount,
            platformFee: 0,
            netAmount:   amount,
            status:      'completed',
            processedAt: new Date()
        }], { session });

        await session.commitTransaction();

        const remaining = Math.max(0, Math.round((pendingRaw - amount) * 100) / 100);

        return res.status(200).json({
            success: true,
            message: `Commission of PKR ${amount.toFixed(2)} settled via ${method}.`,
            amount,
            method,
            wallet: updatedWallet ? updatedWallet.toObject() : null,
            payable_commission: remaining
        });

    } catch (error) {
        await session.abortTransaction();
        if (error && error.code === 11000) {
            return res.status(200).json({ success: true, message: 'Commission already settled.' });
        }
        next(error);
    } finally {
        session.endSession();
    }
};

module.exports = {
    getWallet,
    getTransactions,
    requestWithdrawal,
    getWithdrawals,
    getNotifications,
    markNotificationsRead,
    requestJazzCashWithdrawal,
    payCommission
};
