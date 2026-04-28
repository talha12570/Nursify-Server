/**
 * Test Booking System
 * 
 * This script tests the booking endpoints
 * Run with: node test-booking.js
 */

const axios = require('axios');

const API_URL = 'http://192.168.0.106:5000/api';

// Replace these with actual values from your database
const TEST_CONFIG = {
    patientToken: '', // Get from login response
    caregiverId: '',  // Get from caregivers list
};

async function testCreateBooking() {
    console.log('\n=== Testing Create Booking ===');
    
    try {
        const bookingData = {
            caregiverId: TEST_CONFIG.caregiverId,
            serviceType: 'Home Caregiver',
            date: '2025-12-26',
            time: '09:00',
            duration: 'hourly',
            location: 'House 123, Street 5, DHA Phase 2, Lahore',
            paymentMethod: 'cash',
            amount: 800
        };

        const response = await axios.post(
            `${API_URL}/patient/bookings`,
            bookingData,
            {
                headers: {
                    'Authorization': `Bearer ${TEST_CONFIG.patientToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Booking created successfully!');
        console.log('Booking ID:', response.data.booking._id);
        console.log('Status:', response.data.booking.status);
        console.log('Amount:', response.data.booking.amount);
        console.log('Caregiver:', response.data.booking.caregiver.fullName);
        
        return response.data.booking._id;
    } catch (error) {
        console.error('❌ Error creating booking:');
        console.error(error.response?.data || error.message);
        return null;
    }
}

async function testGetBookings() {
    console.log('\n=== Testing Get Bookings ===');
    
    try {
        const response = await axios.get(
            `${API_URL}/patient/bookings`,
            {
                headers: {
                    'Authorization': `Bearer ${TEST_CONFIG.patientToken}`
                }
            }
        );

        console.log('✅ Bookings retrieved successfully!');
        console.log('Total bookings:', response.data.count);
        console.log('Bookings:', response.data.bookings.map(b => ({
            id: b._id,
            service: b.serviceType,
            date: b.date,
            status: b.status,
            amount: b.amount
        })));
    } catch (error) {
        console.error('❌ Error fetching bookings:');
        console.error(error.response?.data || error.message);
    }
}

async function testGetBookingById(bookingId) {
    console.log('\n=== Testing Get Booking by ID ===');
    
    try {
        const response = await axios.get(
            `${API_URL}/patient/bookings/${bookingId}`,
            {
                headers: {
                    'Authorization': `Bearer ${TEST_CONFIG.patientToken}`
                }
            }
        );

        console.log('✅ Booking details retrieved successfully!');
        console.log('Service:', response.data.booking.serviceType);
        console.log('Date:', response.data.booking.date);
        console.log('Time:', response.data.booking.time);
        console.log('Duration:', response.data.booking.duration);
        console.log('Location:', response.data.booking.location);
        console.log('Amount:', response.data.booking.amount);
        console.log('Status:', response.data.booking.status);
    } catch (error) {
        console.error('❌ Error fetching booking:');
        console.error(error.response?.data || error.message);
    }
}

async function testCancelBooking(bookingId) {
    console.log('\n=== Testing Cancel Booking ===');
    
    try {
        const response = await axios.put(
            `${API_URL}/patient/bookings/${bookingId}/cancel`,
            {
                reason: 'Testing cancellation'
            },
            {
                headers: {
                    'Authorization': `Bearer ${TEST_CONFIG.patientToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Booking cancelled successfully!');
        console.log('Status:', response.data.booking.status);
        console.log('Cancelled by:', response.data.booking.cancelledBy);
        console.log('Reason:', response.data.booking.cancellationReason);
    } catch (error) {
        console.error('❌ Error cancelling booking:');
        console.error(error.response?.data || error.message);
    }
}

async function runTests() {
    console.log('🧪 Starting Booking System Tests\n');
    console.log('API URL:', API_URL);
    
    // Check configuration
    if (!TEST_CONFIG.patientToken || !TEST_CONFIG.caregiverId) {
        console.error('\n⚠️  Please update TEST_CONFIG with actual values:');
        console.error('1. Login as patient to get token');
        console.error('2. Get caregiverId from caregivers list');
        console.error('3. Update TEST_CONFIG in this file');
        return;
    }
    
    // Test create booking
    const bookingId = await testCreateBooking();
    
    if (bookingId) {
        // Test get all bookings
        await testGetBookings();
        
        // Test get specific booking
        await testGetBookingById(bookingId);
        
        // Test cancel booking
        await testCancelBooking(bookingId);
        
        // Get bookings again to verify cancellation
        await testGetBookings();
    }
    
    console.log('\n✅ All tests completed!');
}

// Run tests
runTests().catch(console.error);

module.exports = { testCreateBooking, testGetBookings, testGetBookingById, testCancelBooking };
