require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./modals/user-modals');

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        const users = await User.find({}).select('email fullName userType isVerified isApproved isAdmin');
        
        if (users.length === 0) {
            console.log('⚠️  No users found in database');
            console.log('You need to register a user first\n');
        } else {
            console.log(`📊 Found ${users.length} user(s):\n`);
            users.forEach((user, index) => {
                console.log(`${index + 1}. ${user.fullName}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Type: ${user.userType}`);
                console.log(`   Admin: ${user.isAdmin}`);
                console.log(`   Verified: ${user.isVerified}`);
                console.log(`   Approved: ${user.isApproved}`);
                console.log('');
            });
        }
        
        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkUsers();
