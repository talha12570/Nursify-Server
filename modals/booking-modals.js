const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    caregiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    serviceType: {
        type: String,
        required: true,
        enum: [
            'Home Caregiver',
            'Hospital Assistant',
            'IV Therapy',
            'Wound Care',
            'ICU Care',
            'Elderly Care',
            'Pediatric Nurse',
            'Burn Care',
            'Autism Therapy'
        ]
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    duration: {
        type: String,
        required: true,
        enum: ['hourly', 'daily', 'weekly', 'monthly']
    },
    location: {
        type: String,
        required: true
    },
    patientLatitude: {
        type: Number,
        default: null
    },
    patientLongitude: {
        type: Number,
        default: null
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['jazzcash', 'easypaisa', 'card', 'cash']
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'approved', 'rejected', 'confirmed', 'on_the_way', 'arrived', 'service_started', 'service_completed', 'completed_confirmed', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    notes: {
        type: String,
        default: ''
    },
    // Service lifecycle timestamps
    onTheWayAt: {
        type: Date
    },
    arrivedAt: {
        type: Date
    },
    serviceStartedAt: {
        type: Date
    },
    serviceCompletedAt: {
        type: Date
    },
    completedConfirmedAt: {
        type: Date
    },
    cancelledBy: {
        type: String,
        enum: ['patient', 'caregiver'],
        default: null
    },
    cancelledByUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        default: null
    },
    cancelledAt: {
        type: Date,
        default: null
    },
    cancellationReason: {
        type: String,
        default: null
    },
    penaltyFlag: {
        type: Boolean,
        default: false
    },
    refundStatus: {
        type: String,
        enum: ['not_applicable', 'pending', 'processed', 'failed'],
        default: 'not_applicable'
    },
    completedAt: {
        type: Date
    },
    // UTC datetime range for conflict detection
    startDateTime: {
        type: Date
    },
    endDateTime: {
        type: Date
    },
    // Payment tracking
    transactionId: {
        type: String,
        default: null
    },
    orderId: {
        type: String,
        default: null
    },
    // Set at session creation so the webhook can match MPGS orderId → booking
    mpgsOrderId: {
        type: String,
        default: null
    },
    paymentWebhookReceivedAt: {
        type: Date,
        default: null
    },
    // Weekly booking grouping
    weeklyGroupId: {
        type: String,
        default: null
    },
    hoursPerDay: {
        type: Number,
        default: null
    },
    weeklyDayIndex: {
        type: Number,
        default: null
    },
    // Review tracking
    patientReviewSubmitted: {
        type: Boolean,
        default: false
    },
    caregiverReviewSubmitted: {
        type: Boolean,
        default: false
    },
    patientReviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
    },
    caregiverReviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
    },
    reviewsCompletedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for faster queries
bookingSchema.index({ patient: 1, createdAt: -1 });
bookingSchema.index({ caregiver: 1, createdAt: -1 });
bookingSchema.index({ date: 1, status: 1 });
// Compound index for O(log n) conflict detection queries
bookingSchema.index({ caregiver: 1, startDateTime: 1, endDateTime: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
