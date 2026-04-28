const mongoose = require('mongoose');
const User = require('./modals/user-modals');

mongoose.connect('mongodb://localhost:27017/nursify')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Find users without phone numbers
    const usersWithoutPhone = await User.find({ 
      $or: [
        { phone: null },
        { phone: '' },
        { phone: { $exists: false } }
      ]
    });
    
    console.log(`Found ${usersWithoutPhone.length} users without phone numbers`);
    
    // Add default phone numbers
    for (const user of usersWithoutPhone) {
      user.phone = '+92 300 1234567'; // Default phone number
      await user.save();
      console.log(`Added phone to user: ${user.email}`);
    }
    
    console.log('Migration completed!');
    mongoose.connection.close();
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
