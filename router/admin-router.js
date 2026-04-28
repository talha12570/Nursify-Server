const express = require("express");
const admin_controller = require("../controllers/admin-controllers");
const complaint_controller = require("../controllers/complaint-controllers");
const router = express.Router();
const authMiddleware = require("../middleware/auth-middleware");
const adminMiddleware=require("../middleware/admin-middleware")

// Dashboard stats
router.route('/dashboard/stats').get(authMiddleware,adminMiddleware,admin_controller.getDashboardStats);

// Reviews
router.route('/reviews').get(authMiddleware,adminMiddleware,admin_controller.getAllReviews);

// Safety complaints
router.route('/complaints').get(authMiddleware,adminMiddleware,complaint_controller.getAdminComplaints);
router.route('/complaints/:id').patch(authMiddleware,adminMiddleware,complaint_controller.updateComplaintStatus);

// Bookings
router.route('/bookings').get(authMiddleware,adminMiddleware,admin_controller.getAllBookings);

// Payments
router.route('/payments').get(authMiddleware,adminMiddleware,admin_controller.getPaymentStats);

// Wallet (read-only)
router.route('/wallet').get(authMiddleware,adminMiddleware,admin_controller.getAdminWallet);
router.route('/wallet/nurses/:nurseId/transactions').get(authMiddleware,adminMiddleware,admin_controller.getNurseTransactions);

router.route('/users').get(authMiddleware,adminMiddleware,admin_controller.getAllUser);

// User approval routes - MUST come before /users/:id to avoid route conflicts
router.route('/users/pending').get(authMiddleware,adminMiddleware,admin_controller.getPendingUsers);
router.route('/users/approve/:id').patch(authMiddleware,adminMiddleware,admin_controller.approveUser);
router.route('/users/reject/:id').patch(authMiddleware,adminMiddleware,admin_controller.rejectUser);
router.route('/users/verification/:id').get(authMiddleware,adminMiddleware,admin_controller.getUserDetailsForVerification);

// Admin enforcement actions
router.route('/users/:id/warn').post(authMiddleware,adminMiddleware,admin_controller.warnUser);
router.route('/users/:id/suspend').post(authMiddleware,adminMiddleware,admin_controller.suspendUser);
router.route('/users/:id/ban').post(authMiddleware,adminMiddleware,admin_controller.banUser);

// Generic user routes - these must come AFTER specific routes
router.route('/users/delete/:id').delete(authMiddleware,adminMiddleware,admin_controller.deleteUserById);
router.route('/users/:id').get(authMiddleware,adminMiddleware,admin_controller.GetUserById);
router.route('/users/update/:id').patch(authMiddleware,adminMiddleware,admin_controller.UpdateUserById);

module.exports = router;