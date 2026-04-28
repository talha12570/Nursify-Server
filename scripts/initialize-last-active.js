const mongoose = require('mongoose');
const User = require('../modals/user-modals');
require('dotenv').config();

async function initializeLastActive() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Update all users without lastActive field
        const result = await User.updateMany(
            { lastActive: { $exists: false } },
            { $set: { lastActive: new Date() } }
        );

        console.log(`Updated ${result.modifiedCount} users with lastActive field`);

        // Also update users where lastActive is null
        const result2 = await User.updateMany(
            { lastActive: null },
            { $set: { lastActive: new Date() } }
        );

        console.log(`Updated ${result2.modifiedCount} users with null lastActive`);

        // Get total count of users
        const totalUsers = await User.countDocuments({});
        console.log(`Total users in database: ${totalUsers}`);

        // Get count of users with valid lastActive
        const usersWithLastActive = await User.countDocuments({
            lastActive: { $exists: true, $ne: null }
        });
        console.log(`Users with valid lastActive: ${usersWithLastActive}`);

        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

initializeLastActive();
