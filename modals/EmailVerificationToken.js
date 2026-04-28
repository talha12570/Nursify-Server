const mongoose = require("mongoose");

const emailVerificationTokenSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
    },
    token: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600, // Token expires after 1 hour (3600 seconds)
    },
});

// Index for faster queries
emailVerificationTokenSchema.index({ owner: 1 });
emailVerificationTokenSchema.index({ token: 1 });

// Method to compare OTP tokens (plain text comparison)
emailVerificationTokenSchema.methods.compareToken = async function (candidateToken) {
    try {
        console.log('[compareToken] ========== TOKEN COMPARISON ==========');
        console.log('[compareToken] Stored token:', this.token);
        console.log('[compareToken] Stored token type:', typeof this.token);
        console.log('[compareToken] Stored token length:', this.token ? this.token.length : 0);
        console.log('[compareToken] Candidate token:', candidateToken);
        console.log('[compareToken] Candidate token type:', typeof candidateToken);
        console.log('[compareToken] Candidate token length:', candidateToken ? candidateToken.length : 0);
        
        // Convert both to strings and trim whitespace
        const storedToken = String(this.token).trim();
        const providedToken = String(candidateToken).trim();
        
        console.log('[compareToken] After trim - Stored:', storedToken);
        console.log('[compareToken] After trim - Provided:', providedToken);
        console.log('[compareToken] Exact match:', storedToken === providedToken);
        console.log('[compareToken] ==========================================');
        
        // Simple string comparison for OTP (tokens are stored as plain text)
        return storedToken === providedToken;
    } catch (error) {
        console.error('[EmailVerificationToken] Error comparing token:', error);
        return false;
    }
};

const EmailVerificationToken = mongoose.model("EmailVerificationToken", emailVerificationTokenSchema);

module.exports = EmailVerificationToken;
