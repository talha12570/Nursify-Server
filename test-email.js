require('dotenv').config();
const transport = require('./config/emailTransport');

/**
 * Test script to verify email sending works
 * Usage: node test-email.js your-email@example.com
 */

const testEmail = async (recipientEmail) => {
    console.log('\n========================================');
    console.log('🧪 EMAIL SEND TEST');
    console.log('========================================');
    console.log('Recipient:', recipientEmail);
    console.log('Time:', new Date().toISOString());
    console.log('========================================\n');

    const testOTP = '123456';
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Test Email from Nursify</h1>
            <p>This is a test email to verify SMTP configuration.</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #1f2937; margin: 0;">Test OTP: ${testOTP}</h2>
            </div>
            <p>If you received this email, your SMTP configuration is working correctly!</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Sent at: ${new Date().toLocaleString()}
            </p>
        </div>
    `;

    try {
        console.log('📧 Attempting to send email...\n');
        
        const info = await transport.sendMail({
            from: '"Nursify Healthcare" <noreply@nursify.com>',
            to: recipientEmail,
            subject: '🧪 Test Email - Nursify SMTP Configuration',
            html: htmlContent,
            text: `Test Email from Nursify\n\nTest OTP: ${testOTP}\n\nIf you received this email, your SMTP configuration is working correctly!`
        });

        console.log('========================================');
        console.log('✅ EMAIL SENT SUCCESSFULLY!');
        console.log('========================================');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
        console.log('Accepted:', info.accepted);
        console.log('Rejected:', info.rejected);
        console.log('Envelope:', JSON.stringify(info.envelope, null, 2));
        console.log('========================================\n');
        
        console.log('✅ SMTP is configured correctly!');
        console.log('📬 Check your inbox at:', recipientEmail);
        console.log('📁 Also check spam/junk folder\n');
        
        process.exit(0);
    } catch (error) {
        console.log('========================================');
        console.log('❌ EMAIL SEND FAILED!');
        console.log('========================================');
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        console.error('Command:', error.command);
        console.error('Response:', error.response);
        console.log('========================================\n');
        
        console.log('🔧 TROUBLESHOOTING STEPS:\n');
        
        if (error.code === 'EAUTH') {
            console.log('❌ Authentication failed - Invalid credentials');
            console.log('\nFor Gmail:');
            console.log('1. Enable 2-Factor Authentication on your Google account');
            console.log('2. Generate an App Password:');
            console.log('   https://myaccount.google.com/apppasswords');
            console.log('3. Use the App Password (16 characters) in SMTP_PASS');
            console.log('4. DO NOT use your regular Gmail password\n');
        } else if (error.code === 'ESOCKET' || error.code === 'ECONNECTION') {
            console.log('❌ Connection failed - Cannot reach SMTP server');
            console.log('\nCheck:');
            console.log('1. Internet connection');
            console.log('2. Firewall/antivirus blocking port 587');
            console.log('3. SMTP_HOST and SMTP_PORT are correct\n');
        } else if (error.responseCode === 535) {
            console.log('❌ Authentication rejected by server');
            console.log('\nFor Gmail: Use App Password, not regular password\n');
        }
        
        console.log('Current Configuration:');
        console.log('- SMTP_HOST:', process.env.SMTP_HOST || 'NOT SET');
        console.log('- SMTP_PORT:', process.env.SMTP_PORT || 'NOT SET');
        console.log('- SMTP_USER:', process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 5) + '***' : 'NOT SET');
        console.log('- SMTP_PASS:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.substring(process.env.SMTP_PASS.length - 3) : 'NOT SET');
        console.log('- SMTP_SECURE:', process.env.SMTP_SECURE || 'NOT SET');
        console.log('\n');
        
        process.exit(1);
    }
};

// Get recipient email from command line argument
const recipientEmail = process.argv[2];

if (!recipientEmail) {
    console.error('\n❌ Error: Please provide recipient email address');
    console.log('\nUsage: node test-email.js your-email@example.com');
    console.log('Example: node test-email.js john@gmail.com\n');
    process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(recipientEmail)) {
    console.error('\n❌ Error: Invalid email format');
    console.log('Please provide a valid email address\n');
    process.exit(1);
}

// Run the test
testEmail(recipientEmail);
