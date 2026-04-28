require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./modals/user-modals');

const createAdminUser = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: 'admin@nursify.com' });
        if (existingAdmin) {
            console.log('Admin user already exists!');
            console.log('Email: admin@nursify.com');
            process.exit(0);
        }

        // Create admin user
        const adminUser = new User({
            fullName: 'Admin User',
            email: 'admin@nursify.com',
            password: 'admin123', // Will be hashed automatically by pre-save hook
            phone: '0000000000',
            userType: 'patient', // Using patient as base type since admin is separate
            cnicNumber: '0000000000000', // Dummy CNIC for admin
            licenseNumber: 'ADMIN000000', // Dummy license to avoid null collision
            isAdmin: true,
            isApproved: true,
            isVerified: true,
        });

        await adminUser.save();
        console.log('✓ Admin user created successfully!');
        console.log('Email: admin@nursify.com');
        console.log('Password: admin123');
        console.log('\nPlease change this password after first login!');
        
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
};

createAdminUser();
