const Queue = require('bull');
const transport = require('../config/emailTransport');

// Don't initialize queue - just send emails synchronously
// Redis is optional and we handle failures gracefully
console.log('📧 Email system initialized (synchronous mode - Redis optional)');
redisAvailable = false;

// No queue processing since we're using synchronous sending

// Export functions to add jobs
module.exports = {
    addEmailJob: async (emailData) => {
        console.log('[jobQueue] ========== EMAIL SEND ATTEMPT ==========');
        console.log('[jobQueue] To:', emailData.to);
        console.log('[jobQueue] Subject:', emailData.subject);
        console.log('[jobQueue] Mode: Synchronous (Redis disabled)');
        console.log('[jobQueue] Timestamp:', new Date().toISOString());
        
        // Always send email synchronously (Redis disabled for simplicity)
        console.log('[jobQueue] 📧 Sending email synchronously');
        console.log('[jobQueue] From: Nursify Healthcare <noreply@nursify.com>');
        
        try {
            console.log('[jobQueue] Calling transport.sendMail()...');
            const info = await transport.sendMail({
                from: "Nursify Healthcare <noreply@nursify.com>",
                to: emailData.to,
                subject: emailData.subject,
                html: emailData.html
            });
            console.log('[jobQueue] ✅ Email sent successfully!');
            console.log('[jobQueue] Message ID:', info.messageId);
            console.log('[jobQueue] Response:', info.response);
            console.log('[jobQueue] ==========================================');
            return { success: true, messageId: info.messageId, info };
        } catch (sendError) {
            console.error('[jobQueue] ❌ CRITICAL: Email send failed!');
            console.error('[jobQueue] Error:', sendError.message);
            console.error('[jobQueue] Stack:', sendError.stack);
            console.error('[jobQueue] ==========================================');
            throw sendError;
        }
    },
    
    getQueue: () => emailQueue,
    
    // Get queue stats
    getStats: async () => {
        if (!emailQueue) {
            return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, available: false };
        }
        
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            emailQueue.getWaitingCount(),
            emailQueue.getActiveCount(),
            emailQueue.getCompletedCount(),
            emailQueue.getFailedCount(),
            emailQueue.getDelayedCount()
        ]);
        
        return { waiting, active, completed, failed, delayed, available: true };
    }
};
