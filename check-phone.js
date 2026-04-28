const mongoose = require('mongoose');
const User = require('./modals/user-modals');

mongoose.connect('mongodb://localhost:27017/nursify')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Check user with phone
    const user = await User.findOne({ email: 'talha.aslam591@gmail.com' })
      .select('fullName email phone userType');
    
    console.log('User data:');
    console.log('- Full Name:', user?.fullName);
    console.log('- Email:', user?.email);
    console.log('- Phone:', user?.phone);
    console.log('- User Type:', user?.userType);
    console.log('- Phone exists?', !!user?.phone);
    
    mongoose.connection.close();
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
