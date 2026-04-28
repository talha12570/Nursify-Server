const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
    nurse:  { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },

    amount: { type: Number, required: true },

    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'processing'
    },

    bankDetails: {
        accountTitle:  String,
        accountNumber: String, // stored masked: ****1234
        bankName:      String,
        branchCode:    String
    },

    sandboxReference: String,
    failureReason:    String,
    requestedAt:      { type: Date, default: Date.now },
    processedAt:      Date
}, { timestamps: true });

withdrawalSchema.index({ nurse: 1, createdAt: -1 });

module.exports = mongoose.model('WithdrawalRequest', withdrawalSchema);
