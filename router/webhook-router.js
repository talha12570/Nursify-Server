const express = require('express');
const router  = express.Router();
const { handleMpgsWebhook } = require('../controllers/webhook-controller');

// No authMiddleware — MPGS posts here directly, verified by HMAC signature internally
router.post('/mpgs', handleMpgsWebhook);

module.exports = router;
