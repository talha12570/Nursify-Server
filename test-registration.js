/**
 * Quick test to verify server is accepting multipart/form-data
 * Run this on your computer (not on phone) to test the endpoint
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const testRegistration = async () => {
  try {
    console.log('\n========================================');
    console.log('🧪 Testing Registration Endpoint');
    console.log('========================================\n');

    const formData = new FormData();
    
    // Add text fields
    formData.append('fullName', 'Test User');
    formData.append('email', 'testuser@example.com');
    formData.append('password', 'Password123');
    formData.append('phone', '1234567890');
    formData.append('userType', 'patient');
    formData.append('cnicNumber', '12345-1234567-1');

    console.log('📤 Sending test registration request...');
    console.log('   URL: http://192.168.0.106:5000/api/auth/register');
    console.log('   UserType: patient (no images required)');

    const response = await axios.post(
      'http://192.168.0.106:5000/api/auth/register',
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 30000,
      }
    );

    console.log('\n✅ SUCCESS!');
    console.log('   Response:', response.data);
    console.log('\n📱 Server is working! Now try registering from mobile app.');
    console.log('\n========================================\n');

  } catch (error) {
    console.error('\n❌ ERROR!');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data);
    } else if (error.request) {
      console.error('   Network Error: No response from server');
      console.error('   Make sure server is running at http://192.168.0.106:5000');
    } else {
      console.error('   Error:', error.message);
    }
    console.error('\n========================================\n');
    process.exit(1);
  }
};

testRegistration();
