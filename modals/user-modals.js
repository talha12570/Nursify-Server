const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    phone: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    userType: {
        type: String,
        enum: ['patient', 'nurse', 'caretaker', 'admin'],
        default: 'patient',
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    isApproved: {
        type: Boolean,
        default: false,
    },
    isRejected: {
        type: Boolean,
        default: false,
    },
    rejectionReason: {
        type: String,
        default: null,
    },
    adminStatus: {
        type: String,
        enum: ['active', 'warned', 'suspended', 'banned'],
        default: 'active',
    },
    suspensionEndDate: {
        type: Date,
        default: null,
    },
    adminActionNote: {
        type: String,
        default: null,
    },
    cnicNumber: {
        type: String,
        required: true,
    },
    cnicFront: {
        type: String, // Cloudinary URL
        default: null,
    },
    cnicBack: {
        type: String, // Cloudinary URL
        default: null,
    },
    specialty: {
        type: String,
        default: null,
    },
    licenseNumber: {
        type: String,
        default: undefined,
    },
    licenseType: {
        type: String,
        default: null,
    },
    licensePhoto: {
        type: String, // Cloudinary URL
        default: null,
    },
    experienceLetter: {
        type: String, // Cloudinary URL
        default: null,
    },
    experienceImage: {
        type: String, // Cloudinary URL
        default: null,
    },
    professionalImage: {
        type: String, // Cloudinary URL
        default: null,
    },
    medicalRecord: {
        type: String, // Cloudinary URL (for patients)
        default: null,
    },
    isAvailable: {
        type: Boolean,
        default: true,
    },
    workExperience: {
        type: String,
        default: null,
    },
    about: {
        type: String,
        default: null,
    },
    education: {
        type: String,
        default: null,
    },
    institution: {
        type: String,
        default: null,
    },
    hourlyRate: {
        type: Number,
        default: null,
    },
    dailyRate: {
        type: Number,
        default: null,
    },
    weeklyRate: {
        type: Number,
        default: null,
    },
    monthlyRate: {
        type: Number,
        default: null,
    },
    pricingOverrides: {
        hourly: { type: Number, default: null },
        daily4: { type: Number, default: null },
        daily6: { type: Number, default: null },
        weekly1: { type: Number, default: null },
        weekly2: { type: Number, default: null },
        weekly3: { type: Number, default: null },
    },
    // Location data for caregivers
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0],
        },
        address: {
            type: String,
            default: '',
        },
        city: {
            type: String,
            default: '',
        },
    },
    // Rating and reviews
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    totalReviews: {
        type: Number,
        default: 0,
    },
    totalBookings: {
        type: Number,
        default: 0,
    },
    // Patients' saved caregivers
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
    }],
    // Activity tracking
    lastActive: {
        type: Date,
        default: Date.now,
    },
    // Last GPS sample quality metadata
    locationUpdatedAt: {
        type: Date,
        default: null,
    },
    locationAccuracy: {
        type: Number,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Create geospatial index for location-based queries
userSchema.index({ location: '2dsphere' });

// Index for efficient queries
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ userType: 1 });
userSchema.index({ isApproved: 1 });
userSchema.index({ isVerified: 1 });
userSchema.index({ cnicNumber: 1 }, { unique: true });
userSchema.index(
    { licenseNumber: 1 },
    {
        unique: true,
        partialFilterExpression: {
            licenseNumber: { $type: 'string', $ne: '' },
        },
    }
);

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
    const user = this;
    
    // Only hash the password if it has been modified
    if (!user.isModified("password")) {
        return next();
    }

    try {
        const saltRound = 10;
        const hash_password = await bcrypt.hash(user.password, saltRound);
        user.password = hash_password;
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function (password) {
    try {
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        throw new Error("Password comparison failed");
    }
};

// Method to generate JWT token
userSchema.methods.generateToken = async function () {
    try {
        return jwt.sign(
            {
                userId: this._id.toString(),
                email: this.email,
                userType: this.userType,
                isAdmin: this.isAdmin,
            },
            process.env.JWT_SECRET_KEY,
            {
                expiresIn: "30d",
            }
        );
    } catch (error) {
        throw new Error("Token generation failed");
    }
};

// Update updatedAt timestamp before saving
userSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

const User = mongoose.model("users", userSchema);

module.exports = User;
