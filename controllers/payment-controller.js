/**
 * ═══════════════════════════════════════════════════════════════════
 * MASTERCARD PAYMENT GATEWAY CONTROLLER
 * ═══════════════════════════════════════════════════════════════════
 *
 * Authenticates to Mastercard MPGS using OAuth 1.0a + RSA-SHA256.
 * Certificate: Server/certs/Nursify-sandbox-signing.p12
 *
 * Required .env variables:
 *   MASTERCARD_CONSUMER_KEY          – From Mastercard Developer Portal
 *   MASTERCARD_SIGNING_KEY_PATH      – Path to .p12 (relative to Server/)
 *   MASTERCARD_SIGNING_KEY_PASSWORD  – Password for the .p12 (default: keystorepassword)
 *   MASTERCARD_MERCHANT_ID           – From acquiring bank (leave blank for simulation)
 *   MASTERCARD_API_PASSWORD          – From MPGS merchant portal (leave blank for simulation)
 *   MASTERCARD_GATEWAY_URL           – Sandbox: https://test-akamai.gateway.mastercard.com
 *   MASTERCARD_API_VERSION           – 61
 * ═══════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const axios   = require('axios');
const Booking = require('../modals/booking-modals');
const { getAuthHeader } = require('../utils/mastercardOAuth');
const { processPaymentSuccess } = require('../services/paymentService');

// ── Gateway config ─────────────────────────────────────────────────────────
const GATEWAY_URL  = process.env.MASTERCARD_GATEWAY_URL || 'https://test-akamai.gateway.mastercard.com';
const API_VERSION  = process.env.MASTERCARD_API_VERSION || '61';
const MERCHANT_ID  = process.env.MASTERCARD_MERCHANT_ID || '';
const API_PASSWORD = process.env.MASTERCARD_API_PASSWORD || '';

const isMpgsConfigured = () => !!(MERCHANT_ID && API_PASSWORD);

// Unique IDs
const generateOrderId = (bookingId) => `ORD-${bookingId.slice(-8).toUpperCase()}-${Date.now()}`;
const generateTxnId   = () => `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

// Build HTTP Basic Auth header for MPGS REST (used alongside OAuth)
const buildBasicAuth = () => {
    const creds = Buffer.from(`merchant.${MERCHANT_ID}:${API_PASSWORD}`).toString('base64');
    return `Basic ${creds}`;
};

// ── Luhn validation ────────────────────────────────────────────────────────
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

// ── Build OAuth-signed axios request ──────────────────────────────────────
const signedRequest = async (method, url, body = null) => {
    const oauthHeader = getAuthHeader(url, method.toUpperCase(), body);
    const headers = {
        'Content-Type': 'application/json',
        'x-mastercard-consumer-key': process.env.MASTERCARD_CONSUMER_KEY
    };

    // When full MPGS merchant credentials are present, use Basic Auth for MPGS
    // and include the OAuth signature as an extra integrity header
    if (isMpgsConfigured()) {
        headers['Authorization'] = buildBasicAuth();
        headers['x-mastercard-authorization'] = oauthHeader;
    } else {
        // OAuth-only mode (developer sandbox without merchant credentials)
        headers['Authorization'] = oauthHeader;
    }

    const config = { headers, timeout: 30000 };
    return axios({ method: method.toLowerCase(), url, data: body || undefined, ...config });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/mastercard/initiate
// Body: { bookingId, cardNumber, expiryMonth, expiryYear, cvv, cardholderName }
// ─────────────────────────────────────────────────────────────────────────────
const initiatePayment = async (req, res, next) => {
    try {
        // Validate request body exists
        if (!req.body) {
            return res.status(400).json({ success: false, message: 'Request body is required.' });
        }

        const patientId = req.user._id;
        const { bookingId, cardNumber, expiryMonth, expiryYear, cvv, cardholderName } = req.body;

        // ── 1. Input validation ──
        if (!bookingId || !cardNumber || !expiryMonth || !expiryYear || !cvv || !cardholderName) {
            return res.status(400).json({ success: false, message: 'All card fields are required.' });
        }

        const cleanCard = cardNumber.replace(/\s/g, '');
        if (!luhnCheck(cleanCard)) {
            return res.status(400).json({ success: false, message: 'Invalid card number.' });
        }
        if (cvv.length < 3 || cvv.length > 4) {
            return res.status(400).json({ success: false, message: 'Invalid CVV.' });
        }

        // ── 2. Load and verify booking ──
        const booking = await Booking.findOne({ _id: bookingId, patient: patientId })
            .populate('caregiver', 'fullName');

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        if (booking.status !== 'completed_confirmed') {
            return res.status(400).json({
                success: false,
                message: `Payment is allowed only after service completion is confirmed. Current status: ${booking.status}`
            });
        }
        if (booking.paymentStatus === 'paid') {
            return res.status(400).json({ success: false, message: 'This booking has already been paid.' });
        }

        const orderId = generateOrderId(bookingId);
        const txnId   = generateTxnId();
        const amount  = booking.amount;

        // ── 3. MPGS live payment (merchant credentials required) ──
        if (isMpgsConfigured()) {
            // Step A – Create session (OAuth signed)
            const sessionUrl  = `${GATEWAY_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/session`;
            const sessionBody = { apiOperation: 'CREATE_SESSION', interaction: { operation: 'PURCHASE' } };
            const sessionRes  = await signedRequest('POST', sessionUrl, sessionBody);
            const sessionId   = sessionRes.data?.session?.id;

            if (!sessionId) throw new Error('No session ID returned from MPGS.');

            // Step B – Update session with card details
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
                    description: `Nursify - ${booking.serviceType}`
                },
                billing: { address: { name: cardholderName } }
            };
            await signedRequest('PUT', updateUrl, updateBody);

            // Step C – Process PAY
            const payUrl  = `${GATEWAY_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/order/${orderId}/transaction/${txnId}`;
            const payBody = {
                apiOperation: 'PAY',
                session: { id: sessionId },
                order: {
                    id: orderId,
                    amount: amount.toFixed(2),
                    currency: 'PKR',
                    description: `Nursify - ${booking.serviceType}`
                },
                transaction: { id: txnId },
                customer: { email: req.user.email || '' }
            };
            const payRes = await signedRequest('PUT', payUrl, payBody);
            const gwCode = payRes.data?.response?.gatewayCode;

            if (gwCode !== 'APPROVED') {
                return res.status(402).json({
                    success: false,
                    message: payRes.data?.response?.gatewayRecommendation || 'Card payment declined.',
                    gatewayCode: gwCode
                });
            }

            // Store orderId so webhook can resolve this booking, then process atomically
            await Booking.updateOne({ _id: booking._id }, { orderId, mpgsOrderId: orderId });

            await processPaymentSuccess({
                bookingId:     booking._id,
                orderId,
                transactionId: txnId,
                amount:        booking.amount,
                nurseId:       booking.caregiver?._id || booking.caregiver,
                patientId:     booking.patient,
                paymentMethod: 'mastercard',
                rawPayload:    payRes.data
            });

            const paid = await Booking.findById(booking._id)
                .populate('caregiver', 'fullName email phone')
                .populate('patient',   'fullName email phone');

            return res.status(200).json({
                success: true,
                message: 'Payment successful!',
                transactionId: txnId,
                orderId,
                maskedCard: `**** **** **** ${cleanCard.slice(-4)}`,
                booking: paid
            });
        }

        // ── 4. Simulation mode (sandbox – no MPGS merchant credentials yet) ──
        console.warn('[Payment] MPGS merchant credentials not set — simulation mode.');
        console.log(`[Payment] OAuth cert loaded. Consumer Key prefix: ${(process.env.MASTERCARD_CONSUMER_KEY || '').slice(0, 20)}...`);

        // Verify it's a Mastercard number
        const isMC = /^5[1-5]/.test(cleanCard) || /^2[2-7]/.test(cleanCard);
        if (!isMC) {
            return res.status(400).json({
                success: false,
                message: 'Only Mastercard cards are accepted (numbers starting with 5 or 2).'
            });
        }

        // Store orderId so webhook lookup works if MPGS later sends a real notification
        await Booking.updateOne({ _id: booking._id }, { orderId, mpgsOrderId: orderId });

        await processPaymentSuccess({
            bookingId:     booking._id,
            orderId,
            transactionId: txnId,
            amount:        booking.amount,
            nurseId:       booking.caregiver?._id || booking.caregiver,
            patientId:     booking.patient,
            paymentMethod: 'mastercard',
            rawPayload:    { simulated: true }
        });

        const populatedBooking = await Booking.findById(bookingId)
            .populate('caregiver', 'fullName email phone professionalImage')
            .populate('patient',   'fullName email phone');

        return res.status(200).json({
            success: true,
            message: 'Payment successful! (Sandbox simulation)',
            simulated: true,
            transactionId: txnId,
            orderId,
            maskedCard: `**** **** **** ${cleanCard.slice(-4)}`,
            booking: populatedBooking
        });

    } catch (error) {
        if (error.response?.data) {
            console.error('[Payment] MPGS API error:', JSON.stringify(error.response.data, null, 2));
            return res.status(502).json({
                success: false,
                message: 'Payment gateway error. Please try again.',
                detail: error.response.data?.error?.explanation || 'Gateway unreachable'
            });
        }
        console.error('[Payment] initiatePayment error:', error.message);
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payment/status/:bookingId
// ─────────────────────────────────────────────────────────────────────────────
const getPaymentStatus = async (req, res, next) => {
    try {
        const patientId     = req.user._id;
        const { bookingId } = req.params;

        const booking = await Booking.findOne({ _id: bookingId, patient: patientId })
            .select('paymentStatus paymentMethod status transactionId orderId amount');

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        return res.status(200).json({
            success: true,
            paymentStatus: booking.paymentStatus,
            paymentMethod: booking.paymentMethod,
            bookingStatus: booking.status,
            transactionId: booking.transactionId || null,
            orderId:       booking.orderId || null,
            amount:        booking.amount
        });
    } catch (error) {
        console.error('[Payment] getPaymentStatus error:', error.message);
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal: Process refund after patient cancellation on confirmed card booking
// ─────────────────────────────────────────────────────────────────────────────
const processBookingRefund = async (booking) => {
    if (!booking) {
        return { success: false, message: 'Booking not found for refund.' };
    }

    const isCardPaid = booking.paymentMethod === 'card' && booking.paymentStatus === 'paid';
    if (!isCardPaid) {
        booking.refundStatus = 'not_applicable';
        await booking.save();
        return { success: true, skipped: true, message: 'Refund not applicable.' };
    }

    booking.refundStatus = 'pending';
    await booking.save();

    // Simulation mode: mark as processed immediately.
    if (!isMpgsConfigured()) {
        booking.refundStatus = 'processed';
        booking.paymentStatus = 'refunded';
        await booking.save();
        return { success: true, simulated: true, message: 'Refund processed in simulation mode.' };
    }

    // Live MPGS refund attempt (best effort).
    try {
        if (!booking.orderId || !booking.transactionId) {
            throw new Error('Missing orderId/transactionId required for refund.');
        }

        const refundTxnId = `RFD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const refundUrl = `${GATEWAY_URL}/api/rest/version/${API_VERSION}/merchant/${MERCHANT_ID}/order/${booking.orderId}/transaction/${refundTxnId}`;
        const refundBody = {
            apiOperation: 'REFUND',
            transaction: {
                targetTransactionId: booking.transactionId
            },
            order: {
                id: booking.orderId,
                amount: booking.amount.toFixed(2),
                currency: 'PKR'
            }
        };

        const refundRes = await signedRequest('PUT', refundUrl, refundBody);
        const gwCode = refundRes.data?.response?.gatewayCode;

        if (gwCode !== 'APPROVED') {
            throw new Error(refundRes.data?.response?.gatewayRecommendation || 'Refund declined by gateway.');
        }

        booking.refundStatus = 'processed';
        booking.paymentStatus = 'refunded';
        await booking.save();

        return { success: true, transactionId: refundTxnId, message: 'Refund processed successfully.' };
    } catch (error) {
        booking.refundStatus = 'failed';
        await booking.save();
        return { success: false, message: error.message || 'Refund failed.' };
    }
};

module.exports = { initiatePayment, getPaymentStatus, processBookingRefund };
