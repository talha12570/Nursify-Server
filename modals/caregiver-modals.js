const mongoose = require("mongoose");

const caregiverSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    userType: {
        type: String,
        enum: ['nurse', 'caretaker'],
        required: true
    },
    role: {
        type: String,
        required: true // e.g., "Registered Nurse", "Medical Caregiver", "Home Nurse"
    },
    specialization: {
        type: String,
        required: true // e.g., "ICU Care", "Elderly Care", "Wound Care"
    },
    specialty: {
        type: String
    },
    licenseNumber: {
        type: String
    },
    experience: {
        type: Number, // years of experience
        default: 0
    },
    bio: {
        type: String,
        default: ''
    },
    services: [{
        type: String // e.g., "Home Care", "IV Therapy", "Wound Care"
    }],
    hourlyRate: {
        type: Number,
        required: true // in Rs.
    },
    availability: {
        type: String,
        enum: ['available', 'busy', 'offline'],
        default: 'available'
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0]
        },
        address: {
            type: String,
            default: ''
        },
        city: {
            type: String,
            default: ''
        }
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalReviews: {
        type: Number,
        default: 0
    },
    totalBookings: {
        type: Number,
        default: 0
    },
    completedBookings: {
        type: Number,
        default: 0
    },
    profileImage: {
        type: String,
        default: ''
    },
    cnicFront: {
        type: String
    },
    cnicBack: {
        type: String
    },
    licensePhoto: {
        type: String
    },
    experienceImage: {
        type: String
    },
    experienceLetter: {
        type: String
    },
    verified: {
        type: Boolean,
        default: false
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    languages: [{
        type: String // e.g., "Urdu", "English", "Punjabi"
    }],
    certifications: [{
        name: String,
        issuedBy: String,
        issuedDate: Date
    }]
}, {
    timestamps: true
});

// Index for geospatial queries
caregiverSchema.index({ location: '2dsphere' });

// Index for searching
caregiverSchema.index({ fullName: 'text', specialization: 'text', services: 'text' });

const Caregiver = mongoose.model("caregivers", caregiverSchema);

module.exports = Caregiver;
