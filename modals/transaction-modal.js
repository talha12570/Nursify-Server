const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    idempotencyKey: { type: String, required: true, unique: true },

    type:      { type: String, enum: ['payment', 'withdrawal', 'refund', 'patient_payment', 'cash_record', 'withdraw', 'commission_payment'], required: true },
    direction: { type: String, enum: ['credit', 'debit'], required: true },
    actor:     { type: String, enum: ['NURSE', 'ADMIN'], default: 'NURSE' },
    method:    { type: String, enum: ['mastercard', 'cash', 'jazzcash', 'card'], default: null },

    booking:  { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    patient:  { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    nurse:    { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },

    grossAmount:  { type: Number, required: true },
    platformFee:  { type: Number, default: 0 },
    netAmount:    { type: Number, required: true },

    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'reversed'],
        default: 'completed'
    },

    mpgs: {
        orderId:       String,
        transactionId: String,
        result:        String,
        rawWebhook:    mongoose.Schema.Types.Mixed
    },

    withdrawalId: { type: mongoose.Schema.Types.ObjectId, ref: 'WithdrawalRequest' },

    processedAt: { type: Date, default: Date.now }
}, {
    // Ledger rows are write-once — no updatedAt
    timestamps: { createdAt: true, updatedAt: false }
});

transactionSchema.index({ idempotencyKey: 1 }, { unique: true });
transactionSchema.index({ nurse: 1, createdAt: -1 });
transactionSchema.index({ booking: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
