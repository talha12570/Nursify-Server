const mongoose = require('mongoose');

const adminWalletSchema = new mongoose.Schema({
    total_commission_collected: { type: Number, default: 0 },
    total_commission_pending:   { type: Number, default: 0 },
    currency:                   { type: String, default: 'PKR' }
}, { timestamps: true });

// Helper to get (or create) the single admin wallet document
adminWalletSchema.statics.getSingleton = async function () {
    let wallet = await this.findOne();
    if (!wallet) wallet = await this.create({});
    return wallet;
};

module.exports = mongoose.model('AdminWallet', adminWalletSchema);
