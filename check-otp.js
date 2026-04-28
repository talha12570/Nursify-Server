require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./modals/user-modals');
const EmailVerificationToken = require('./modals/EmailVerificationToken');

const checkOTP = async (email) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        if (!email) {
            console.log('❌ Please provide an email address');
            console.log('Usage: node check-otp.js user@example.com\n');
            process.exit(1);
        }

        const user = await User.findOne({ email });
        
        if (!user) {
            console.log(`❌ User not found: ${email}\n`);
            process.exit(1);
        }

        console.log('📊 User Information:');
        console.log('==========================================');
        console.log('Name:', user.fullName);
        console.log('Email:', user.email);
        console.log('Type:', user.userType);
        console.log('Verified:', user.isVerified);
        console.log('Approved:', user.isApproved);
        console.log('Admin:', user.isAdmin);
        console.log('==========================================\n');

        const token = await EmailVerificationToken.findOne({ owner: user._id });
        
        if (!token) {
            console.log('⚠️  No OTP token found for this user');
            console.log('User may already be verified or token expired\n');
        } else {
            console.log('🔑 OTP Token Information:');
            console.log('==========================================');
            console.log('Token:', token.token);
            console.log('Token Type:', typeof token.token);
            console.log('Token Length:', token.token.length);
            console.log('Created:', token.createdAt);
            console.log('Current Time:', new Date());
            console.log('Age (minutes):', Math.floor((new Date() - new Date(token.createdAt)) / 60000));
            console.log('Expires in:', 60 - Math.floor((new Date() - new Date(token.createdAt)) / 60000), 'minutes');
            console.log('==========================================\n');
            
            if (Math.floor((new Date() - new Date(token.createdAt)) / 60000) >= 60) {
                console.log('⚠️  This token has EXPIRED (>60 minutes old)');
                console.log('User needs to request a new OTP\n');
            } else {
                console.log('✅ Token is still valid');
                console.log('📱 Use this OTP to verify:', token.token, '\n');
            }
        }
        
        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

const email = process.argv[2];
checkOTP(email);
