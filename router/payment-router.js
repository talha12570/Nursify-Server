const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment-controller');
const authMiddleware = require('../middleware/auth-middleware');

// All payment routes require authentication
router.use(authMiddleware);

// Initiate a Mastercard payment and confirm booking
// POST /api/payment/mastercard/initiate
router.post('/mastercard/initiate', paymentController.initiatePayment);

// Get payment status for a booking
// GET /api/payment/status/:bookingId
router.get('/status/:bookingId', paymentController.getPaymentStatus);

module.exports = router;
