require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./modals/user-modals');
const EmailVerificationToken = require('./modals/EmailVerificationToken');

const testVerify = async (email, otp) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        if (!email || !otp) {
            console.log('❌ Please provide email and OTP');
            console.log('Usage: node test-verify.js user@example.com 123456\n');
            process.exit(1);
        }

        console.log('🧪 Testing OTP Verification');
        console.log('==========================================');
        console.log('Email:', email);
        console.log('Provided OTP:', otp);
        console.log('OTP Type:', typeof otp);
        console.log('OTP Length:', otp.length);
        console.log('==========================================\n');

        const user = await User.findOne({ email });
        
        if (!user) {
            console.log(`❌ User not found: ${email}\n`);
            process.exit(1);
        }

        const token = await EmailVerificationToken.findOne({ owner: user._id });
        
        if (!token) {
            console.log('❌ No OTP token found for this user\n');
            process.exit(1);
        }

        console.log('📊 Token Information:');
        console.log('==========================================');
        console.log('Stored Token:', token.token);
        console.log('Stored Type:', typeof token.token);
        console.log('Stored Length:', token.token.length);
        console.log('==========================================\n');

        console.log('🔍 Testing Comparison:');
        console.log('==========================================');
        
        // Test the compareToken method
        const isValid = await token.compareToken(otp);
        
        console.log('Result:', isValid ? '✅ MATCH' : '❌ NO MATCH');
        console.log('==========================================\n');
        
        if (isValid) {
            console.log('✅ OTP verification would SUCCEED');
            console.log('The OTP is correct!\n');
        } else {
            console.log('❌ OTP verification would FAIL');
            console.log('Debugging information:');
            console.log('- Stored:', JSON.stringify(token.token));
            console.log('- Provided:', JSON.stringify(otp));
            console.log('- Direct comparison:', token.token === otp);
            console.log('- After trim:', token.token.trim() === otp.trim());
            console.log('- As strings:', String(token.token) === String(otp));
            console.log('\n');
        }
        
        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

const email = process.argv[2];
const otp = process.argv[3];
testVerify(email, otp);
