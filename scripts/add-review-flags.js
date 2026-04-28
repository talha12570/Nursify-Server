#!/usr/bin/env node
/**
 * Migration Script: Add Review Flags to Existing Bookings
 * 
 * This script adds the review flag fields to all existing bookings
 * that don't have them yet.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../modals/booking-modals');

async function addReviewFlags() {
    try {
        // Connect to database
        const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/Nursify';
        await mongoose.connect(mongoURI);
        console.log('✓ Connected to MongoDB');

        // Find bookings without review flags
        const result = await Booking.updateMany(
            {
                $or: [
                    { patientReviewSubmitted: { $exists: false } },
                    { caregiverReviewSubmitted: { $exists: false } }
                ]
            },
            {
                $set: {
                    patientReviewSubmitted: false,
                    caregiverReviewSubmitted: false
                }
            }
        );

        console.log(`✓ Updated ${result.modifiedCount} bookings with review flags`);

        // Show stats
        const totalBookings = await Booking.countDocuments();
        const completedConfirmed = await Booking.countDocuments({ status: 'completed_confirmed' });
        
        console.log('\nBooking Statistics:');
        console.log(`  Total Bookings: ${totalBookings}`);
        console.log(`  Completed & Confirmed: ${completedConfirmed}`);

        // Disconnect
        await mongoose.disconnect();
        console.log('\n✓ Database connection closed');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run migration
addReviewFlags();
