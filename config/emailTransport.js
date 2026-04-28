require('dotenv').config();
const nodemailer = require("nodemailer");

/**
 * Reusable email transport with connection pooling
 * - Maintains persistent connection to SMTP server
 * - Reduces connection overhead for multiple emails
 * - Supports environment configuration
 * - Includes timeout configurations for better Railway deployment compatibility
 */

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const secure = process.env.SMTP_SECURE === "true" || port === 465;

console.log('[emailTransport] ========================================');
console.log('[emailTransport] Configuring Nodemailer Transport');
console.log('[emailTransport] Host:', host);
console.log('[emailTransport] Port:', port);
console.log('[emailTransport] User:', user ? user.substring(0, 5) + '***' : '❌ NOT SET');
console.log('[emailTransport] Pass:', pass ? '***' + pass.substring(pass.length - 3) : '❌ NOT SET');
console.log('[emailTransport] Secure:', secure);
console.log('[emailTransport] ========================================');

// Validate required credentials
if (!user || !pass) {
    console.error('[emailTransport] ❌ CRITICAL: SMTP credentials missing!');
    console.error('[emailTransport] SMTP_USER:', user ? 'SET' : 'MISSING');
    console.error('[emailTransport] SMTP_PASS:', pass ? 'SET' : 'MISSING');
    console.error('[emailTransport] Email functionality will NOT work!');
    console.error('[emailTransport] Please check your .env file');
    console.error('[emailTransport] ========================================');
}

const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    // ✅ Timeout configurations for Railway compatibility
    connectionTimeout: 10000,  // 10 seconds to connect
    greetingTimeout: 10000,    // 10 seconds for greeting
    socketTimeout: 30000,      // 30 seconds for socket operations
    // Connection pooling settings
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5, // 5 emails per second max
    // Debug logging
    logger: false, // Set to true for debugging
    debug: false, // Set to true for debugging
});

// Verify connection on startup with error handling
console.log('[emailTransport] Testing SMTP connection...');
transport.verify()
    .then(() => {
        console.log('[emailTransport] ✅ SMTP connection pool ready');
        console.log('[emailTransport] Email service is operational');
        console.log('[emailTransport] ========================================');
    })
    .catch(err => {
        console.error('[emailTransport] ❌ SMTP connection FAILED!');
        console.error('[emailTransport] Error:', err.message);
        console.error('[emailTransport] Code:', err.code);
        console.error('[emailTransport] ========================================');
        console.error('[emailTransport] Possible causes:');
        console.error('[emailTransport] 1. Wrong SMTP credentials (user/password)');
        console.error('[emailTransport] 2. Gmail: Need App Password (not regular password)');
        console.error('[emailTransport] 3. Gmail: 2FA must be enabled for App Passwords');
        console.error('[emailTransport] 4. Network/firewall blocking SMTP connection');
        console.error('[emailTransport] 5. Wrong SMTP host or port (try 465 instead of 587)');
        console.error('[emailTransport] ========================================');
        console.error('[emailTransport] ⚠️  Continuing server startup with non-functional email...');
        console.error('[emailTransport] Email functionality will be retried automatically.');
        console.error('[emailTransport] ========================================');
    });

module.exports = transport;
