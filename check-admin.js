require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./modals/user-modals');

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const admin = await User.findOne({ email: 'admin@nursify.com' });
        
        if (admin) {
            console.log('✓ Admin user exists!');
            console.log('- Email:', admin.email);
            console.log('- Full Name:', admin.fullName);
            console.log('- Is Admin:', admin.isAdmin);
            console.log('- Is Approved:', admin.isApproved);
            console.log('- Is Verified:', admin.isVerified);
        } else {
            console.log('✗ Admin user does not exist');
            console.log('Run: node createAdmin.js to create admin');
        }
        
        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

checkAdmin();
