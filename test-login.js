require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./modals/user-modals');
const bcrypt = require('bcryptjs');

const testLogin = async (email, password) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        if (!email || !password) {
            console.log('❌ Please provide email and password');
            console.log('Usage: node test-login.js user@example.com password123\n');
            process.exit(1);
        }

        console.log('🧪 Testing Login Credentials');
        console.log('==========================================');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('==========================================\n');

        const user = await User.findOne({ email });
        
        if (!user) {
            console.log(`❌ User not found with email: ${email}`);
            console.log('\nAvailable users:');
            const allUsers = await User.find({}).select('email fullName');
            allUsers.forEach(u => {
                console.log(`  - ${u.email} (${u.fullName})`);
            });
            console.log('\n');
            process.exit(1);
        }

        console.log('✅ User found!');
        console.log('==========================================');
        console.log('Name:', user.fullName);
        console.log('Email:', user.email);
        console.log('Type:', user.userType);
        console.log('Admin:', user.isAdmin);
        console.log('Verified:', user.isVerified);
        console.log('Approved:', user.isApproved);
        console.log('==========================================\n');

        console.log('🔐 Testing Password...');
        const isMatch = await user.comparePassword(password);
        
        console.log('==========================================');
        if (isMatch) {
            console.log('✅ PASSWORD CORRECT!');
            console.log('Login would succeed (credentials are valid)');
        } else {
            console.log('❌ PASSWORD INCORRECT!');
            console.log('The password you provided does not match');
        }
        console.log('==========================================\n');

        if (!user.isVerified) {
            console.log('⚠️  Note: User is NOT verified yet');
            console.log('After login with correct password, OTP will be sent\n');
        }

        if ((user.userType === 'nurse' || user.userType === 'caretaker') && !user.isApproved) {
            console.log('⚠️  Note: User needs admin approval\n');
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
const password = process.argv[3];
testLogin(email, password);
