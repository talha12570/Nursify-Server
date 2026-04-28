const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    reviewer: {  // Patient or Nurse who wrote review
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    reviewee: {  // Patient or Nurse being reviewed
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    reviewerType: {
        type: String,
        enum: ['patient', 'nurse', 'caretaker'],
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    reviewText: {
        type: String,
        minlength: 10,
        maxlength: 500,
        trim: true
    },
    categories: {
        // For nurse/caretaker reviews (patient rating them)
        professionalism: {
            type: Number,
            min: 1,
            max: 5
        },
        punctuality: {
            type: Number,
            min: 1,
            max: 5
        },
        serviceQuality: {
            type: Number,
            min: 1,
            max: 5
        },
        // For patient reviews (nurse rating them)
        cooperation: {
            type: Number,
            min: 1,
            max: 5
        },
        environmentSafety: {
            type: Number,
            min: 1,
            max: 5
        },
        paymentTimeliness: {
            type: Number,
            min: 1,
            max: 5
        },
        // Common
        communication: {
            type: Number,
            min: 1,
            max: 5
        }
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Prevent duplicate reviews for same booking by same reviewer
reviewSchema.index({ booking: 1, reviewer: 1 }, { unique: true });

// Indexes for queries
reviewSchema.index({ reviewee: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1, createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
