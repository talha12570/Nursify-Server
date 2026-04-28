const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },

    type: {
        type: String,
        enum: ['payment_received', 'withdrawal_processed', 'booking_update', 'admin_action'],
        required: true
    },

    title:  { type: String, required: true },
    body:   { type: String, required: true },
    data:   { type: mongoose.Schema.Types.Mixed },

    isRead: { type: Boolean, default: false },
    readAt: Date
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
