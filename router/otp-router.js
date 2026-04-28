const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth-middleware");
const otpController = require("../controllers/otp-controller");

// Email Verification Routes
router.route("/send-verification").post(otpController.sendVerificationOTP);
router.route("/verify").post(otpController.verifyOTP);
router.route("/resend").post(otpController.resendOTP);

// 2FA Routes
router.route("/2fa/send").post(otpController.send2FAOTP);
router.route("/2fa/verify").post(otpController.verify2FAOTP);
router.route("/2fa/enable").post(authMiddleware, otpController.enable2FA);
router.route("/2fa/disable").post(authMiddleware, otpController.disable2FA);

module.exports = router;
