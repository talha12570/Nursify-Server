const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    complainant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    against: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    complainantRole: {
        type: String,
        enum: ['patient', 'nurse', 'caregiver', 'caretaker'],
        required: true
    },
    againstRole: {
        type: String,
        enum: ['patient', 'nurse', 'caregiver', 'caretaker'],
        required: true
    },
    category: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    description: {
        type: String,
        default: '',
        trim: true,
        maxlength: 500
    },
    status: {
        type: String,
        enum: ['open', 'in-review', 'resolved'],
        default: 'open'
    },
    adminAction: {
        type: String,
        enum: ['none', 'warning', 'suspend', 'ban'],
        default: 'none'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    source: {
        type: String,
        default: 'post-service-feedback'
    }
}, {
    timestamps: true
});

complaintSchema.index({ booking: 1, createdAt: -1 });
complaintSchema.index({ complainant: 1, createdAt: -1 });
complaintSchema.index({ against: 1, createdAt: -1 });
complaintSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
