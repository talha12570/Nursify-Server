const Review = require("../modals/review-modals");
const Booking = require("../modals/booking-modals");
const User = require("../modals/user-modals");
const Complaint = require("../modals/complaint-modals");

// Submit a review (patient or caregiver)
const submitReview = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const reviewerId = req.user._id;
        const reviewerType = req.user.userType;
        const { rating, reviewText, categories } = req.body;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        // Get booking details
        const booking = await Booking.findById(bookingId)
            .populate('patient', 'userType')
            .populate('caregiver', 'userType');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Check if booking is completed and confirmed
        if (booking.status !== 'completed_confirmed') {
            return res.status(400).json({
                success: false,
                message: 'Reviews can only be submitted after service completion is confirmed'
            });
        }

        // Determine reviewer role and reviewee
        let revieweeId;
        let isPatientReview = false;
        let isCaregiverReview = false;

        if (booking.patient._id.toString() === reviewerId.toString()) {
            // Patient reviewing caregiver
            revieweeId = booking.caregiver._id;
            isPatientReview = true;

            // Check if patient already reviewed
            if (booking.patientReviewSubmitted) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already submitted a review for this booking'
                });
            }
        } else if (booking.caregiver._id.toString() === reviewerId.toString()) {
            // Caregiver reviewing patient
            revieweeId = booking.patient._id;
            isCaregiverReview = true;

            // Check if caregiver already reviewed
            if (booking.caregiverReviewSubmitted) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already submitted a review for this booking'
                });
            }
        } else {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to review this booking'
            });
        }

        // Disallow review if a complaint already exists for this booking by this user
        const existingComplaint = await Complaint.findOne({ booking: bookingId, complainant: reviewerId });
        if (existingComplaint) {
            return res.status(400).json({
                success: false,
                message: 'You already submitted a complaint for this booking. Review is disabled.'
            });
        }

        // Create review
        const review = new Review({
            booking: bookingId,
            reviewer: reviewerId,
            reviewee: revieweeId,
            reviewerType: reviewerType,
            rating: rating,
            reviewText: reviewText || '',
            categories: categories || {}
        });

        await review.save();

        // Update booking with review info
        if (isPatientReview) {
            booking.patientReviewSubmitted = true;
            booking.patientReviewId = review._id;
        } else if (isCaregiverReview) {
            booking.caregiverReviewSubmitted = true;
            booking.caregiverReviewId = review._id;
        }

        // Check if both reviews are completed
        if (booking.patientReviewSubmitted && booking.caregiverReviewSubmitted) {
            booking.reviewsCompletedAt = new Date();
        }

        await booking.save();

        // Update reviewee's overall rating
        await updateUserRating(revieweeId);

        // Populate review for response
        const populatedReview = await Review.findById(review._id)
            .populate('reviewer', 'fullName userType professionalImage')
            .populate('reviewee', 'fullName userType professionalImage');

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            review: populatedReview
        });
    } catch (error) {
        console.error('Submit review error:', error);
        
        // Handle duplicate review error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'You have already submitted a review for this booking'
            });
        }
        
        next(error);
    }
};

// Get reviews for a user (nurse/caregiver profile)
const getUserReviews = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const reviews = await Review.find({ reviewee: userId })
            .populate('reviewer', 'fullName userType professionalImage')
            .populate('booking', 'serviceType date status')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const totalReviews = await Review.countDocuments({ reviewee: userId });

        // Get user's average rating
        const user = await User.findById(userId).select('rating totalReviews');

        res.status(200).json({
            success: true,
            reviews: reviews,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalReviews / parseInt(limit)),
                totalReviews: totalReviews,
                limit: parseInt(limit)
            },
            userRating: {
                averageRating: user?.rating || 0,
                totalReviews: user?.totalReviews || 0
            }
        });
    } catch (error) {
        console.error('Get user reviews error:', error);
        next(error);
    }
};

// Get review for a specific booking
const getBookingReview = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user._id;

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        // Check if user is part of this booking
        const isPatient = booking.patient.toString() === userId.toString();
        const isCaregiver = booking.caregiver.toString() === userId.toString();

        if (!isPatient && !isCaregiver) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view reviews for this booking'
            });
        }

        // Get reviews for this booking
        const reviews = await Review.find({ booking: bookingId })
            .populate('reviewer', 'fullName userType professionalImage')
            .populate('reviewee', 'fullName userType professionalImage');

        res.status(200).json({
            success: true,
            reviews: reviews,
            reviewStatus: {
                patientReviewSubmitted: booking.patientReviewSubmitted,
                caregiverReviewSubmitted: booking.caregiverReviewSubmitted,
                canSubmitReview: booking.status === 'completed_confirmed' && (
                    (isPatient && !booking.patientReviewSubmitted) ||
                    (isCaregiver && !booking.caregiverReviewSubmitted)
                )
            }
        });
    } catch (error) {
        console.error('Get booking review error:', error);
        next(error);
    }
};

// Get bookings pending review for current user
const getPendingReviews = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const userType = req.user.userType;

        let query = {
            status: 'completed_confirmed'
        };

        // Build query based on user type
        if (userType === 'patient') {
            query.patient = userId;
            query.patientReviewSubmitted = false;
        } else if (userType === 'nurse' || userType === 'caretaker') {
            query.caregiver = userId;
            query.caregiverReviewSubmitted = false;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid user type'
            });
        }

        const pendingBookings = await Booking.find(query)
            .populate('patient', 'fullName email')
            .populate('caregiver', 'fullName email professionalImage specialty')
            .sort({ completedConfirmedAt: -1 })
            .limit(20);

        res.status(200).json({
            success: true,
            count: pendingBookings.length,
            bookings: pendingBookings
        });
    } catch (error) {
        console.error('Get pending reviews error:', error);
        next(error);
    }
};

// Helper function to update user's overall rating
async function updateUserRating(userId) {
    try {
        const reviews = await Review.find({ reviewee: userId });
        
        if (reviews.length === 0) {
            return;
        }

        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / reviews.length;

        await User.findByIdAndUpdate(userId, {
            rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
            totalReviews: reviews.length
        });

        console.log(`Updated rating for user ${userId}: ${averageRating} (${reviews.length} reviews)`);
    } catch (error) {
        console.error('Error updating user rating:', error);
    }
}

// Get top nurses previously reviewed by the current patient (max 2, sorted by nurse rating)
const getTopReviewedNurses = async (req, res, next) => {
    try {
        const reviewerId = req.user._id;

        const reviews = await Review.find({ reviewer: reviewerId })
            .populate('reviewee', 'fullName professionalImage specialty rating isAvailable lastActive status availabilityStatus');

        const nurseMap = new Map();
        for (const review of reviews) {
            const nurse = review.reviewee;
            if (!nurse) continue;
            const id = nurse._id.toString();
            if (!nurseMap.has(id)) {
                nurseMap.set(id, {
                    _id: nurse._id,
                    fullName: nurse.fullName,
                    professionalImage: nurse.professionalImage,
                    specialty: nurse.specialty,
                    rating: nurse.rating || 0,
                    isAvailable: nurse.isAvailable ?? false,
                    lastActive: nurse.lastActive ?? null,
                    status: nurse.status ?? null,
                    availabilityStatus: nurse.availabilityStatus ?? null,
                });
            }
        }

        const nurses = Array.from(nurseMap.values())
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 2);

        res.status(200).json({ success: true, nurses });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    submitReview,
    getUserReviews,
    getBookingReview,
    getPendingReviews,
    getTopReviewedNurses
};
