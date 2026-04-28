const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    nurse: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
        unique: true
    },
    availableBalance:   { type: Number, default: 0, min: 0 },
    pendingBalance:     { type: Number, default: 0, min: 0 },
    totalEarned:        { type: Number, default: 0 },
    totalWithdrawn:     { type: Number, default: 0 },
    // Commission system fields
    digital_balance:    { type: Number, default: 0, min: 0 },
    payable_commission: { type: Number, default: 0, min: 0 },
    currency:         { type: String, default: 'PKR' },
    isActive:         { type: Boolean, default: true }
}, { timestamps: true });

walletSchema.index({ nurse: 1 }, { unique: true });

module.exports = mongoose.model('Wallet', walletSchema);
