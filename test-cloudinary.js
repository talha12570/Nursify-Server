/**
 * Test Script to Verify Cloudinary Configuration
 * Run this to check if your Cloudinary credentials are configured correctly
 * 
 * Usage: node Server/test-cloudinary.js
 */

require('dotenv').config();
const cloudinary = require('./config/cloudinary');

console.log('\n========================================');
console.log('🔍 Cloudinary Configuration Test');
console.log('========================================\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('  CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Not set');
console.log('  CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Not set');
console.log('  CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Not set');

// Check if credentials are still placeholders
if (
  process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name_here' ||
  process.env.CLOUDINARY_API_KEY === 'your_api_key_here' ||
  process.env.CLOUDINARY_API_SECRET === 'your_api_secret_here'
) {
  console.log('\n⚠️  WARNING: You still have placeholder values in your .env file!');
  console.log('   Please update them with your actual Cloudinary credentials.');
  console.log('\n📖 How to get your credentials:');
  console.log('   1. Go to: https://console.cloudinary.com/');
  console.log('   2. Copy Cloud Name, API Key, and API Secret');
  console.log('   3. Update Server/.env file');
  process.exit(1);
}

// Test Cloudinary connection
console.log('\n🔌 Testing Cloudinary Connection...');

cloudinary.api.ping()
  .then((result) => {
    console.log('✅ SUCCESS! Cloudinary is configured correctly.');
    console.log('   Status:', result.status);
    console.log('\n🎉 You can now upload images to Cloudinary!');
    console.log('\n📸 Uploaded images will be stored at:');
    console.log(`   https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`);
    console.log('\n✨ Next Steps:');
    console.log('   1. Update your mobile app to send images as multipart/form-data');
    console.log('   2. Test registration with image upload');
    console.log('   3. Check Admin Portal to see images from Cloudinary');
    console.log('\n========================================\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ ERROR: Failed to connect to Cloudinary');
    console.error('   Message:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Check if your credentials are correct');
    console.error('   2. Go to: https://console.cloudinary.com/');
    console.error('   3. Verify Cloud Name, API Key, and API Secret');
    console.error('   4. Make sure there are no extra spaces or quotes');
    console.error('\n========================================\n');
    process.exit(1);
  });
