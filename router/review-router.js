const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth-middleware");
const {
    submitReview,
    getUserReviews,
    getBookingReview,
    getPendingReviews,
    getTopReviewedNurses
} = require("../controllers/review-controllers");

// All routes require authentication
router.use(authMiddleware);

// Submit a review for a booking
router.post("/submit/:bookingId", submitReview);

// Get all reviews for a specific user (nurse/caregiver profile)
router.get("/user/:userId", getUserReviews);

// Get reviews for a specific booking
router.get("/booking/:bookingId", getBookingReview);

// Get bookings pending review for current user
router.get("/pending", getPendingReviews);

// Get top nurses previously reviewed by the current patient (max 2)
router.get("/top-nurses", getTopReviewedNurses);

module.exports = router;
