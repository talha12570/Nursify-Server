/**
 * Script to delete old test users (users with file:// URIs)
 * Run this to clean up old users registered before Cloudinary integration
 * 
 * Usage: node Server/delete-old-users.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./modals/user-modals');
const EmailVerificationToken = require('./modals/EmailVerificationToken');

const deleteOldUsers = async () => {
  try {
    console.log('\n========================================');
    console.log('🗑️  Deleting Old Test Users');
    console.log('========================================\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find users with file:// URIs (old data before Cloudinary)
    const usersWithFileURIs = await User.find({
      $or: [
        { cnicFront: { $regex: '^file://' } },
        { cnicBack: { $regex: '^file://' } },
        { licensePhoto: { $regex: '^file://' } },
        { experienceLetter: { $regex: '^file://' } },
        { experienceImage: { $regex: '^file://' } }
      ]
    });

    console.log(`\n📊 Found ${usersWithFileURIs.length} users with file:// URIs:\n`);

    if (usersWithFileURIs.length === 0) {
      console.log('✅ No old users to delete!');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Display users
    usersWithFileURIs.forEach((user, index) => {
      console.log(`${index + 1}. ${user.fullName} (${user.email})`);
      console.log(`   User Type: ${user.userType}`);
      console.log(`   Verified: ${user.isVerified ? 'Yes' : 'No'}`);
      console.log(`   Approved: ${user.isApproved ? 'Yes' : 'No'}`);
      console.log(`   Has file:// URIs: Yes`);
      console.log('');
    });

    // Delete these users and their tokens
    console.log('🗑️  Deleting users...\n');

    for (const user of usersWithFileURIs) {
      // Delete user's verification tokens
      await EmailVerificationToken.deleteMany({ owner: user._id });
      console.log(`   ✅ Deleted tokens for ${user.fullName}`);

      // Delete user
      await User.deleteOne({ _id: user._id });
      console.log(`   ✅ Deleted user: ${user.fullName} (${user.email})`);
    }

    console.log(`\n✅ Successfully deleted ${usersWithFileURIs.length} old users!`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Restart your mobile app (close and reopen)');
    console.log('   2. Register a new nurse/caretaker with images');
    console.log('   3. Check admin portal - images should now be visible from Cloudinary!');
    console.log('\n========================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

deleteOldUsers();
