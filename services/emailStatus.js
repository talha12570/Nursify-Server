const transport = require('../config/emailTransport');

let smtpHealthy = false;
let lastError = null;
let lastCheckTime = null;

/**
 * Check SMTP health status
 * This function periodically verifies that the email service is operational
 */
async function checkSMTPHealth() {
    try {
        await transport.verify();
        smtpHealthy = true;
        lastError = null;
        lastCheckTime = new Date();
        console.log('[emailStatus] ✅ SMTP is healthy');
        return true;
    } catch (error) {
        smtpHealthy = false;
        lastError = error.message;
        lastCheckTime = new Date();
        console.error('[emailStatus] ❌ SMTP check failed:', error.message);
        return false;
    }
}

/**
 * Get current SMTP health status
 */
function isHealthy() {
    return smtpHealthy;
}

/**
 * Get last error message
 */
function getLastError() {
    return lastError;
}

/**
 * Get last check time
 */
function getLastCheckTime() {
    return lastCheckTime;
}

// Initial check on module load
checkSMTPHealth();

// Periodic health check every 5 minutes
setInterval(checkSMTPHealth, 5 * 60 * 1000);

module.exports = {
    isHealthy,
    getLastError,
    getLastCheckTime,
    checkHealth: checkSMTPHealth
};
