const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth-middleware');
const { submitComplaint } = require('../controllers/complaint-controllers');

router.use(authMiddleware);
router.post('/submit/:bookingId', submitComplaint);

module.exports = router;
