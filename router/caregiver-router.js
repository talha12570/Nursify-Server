const express = require('express');
const router = express.Router();
const caregiverController = require('../controllers/caregiver-controllers');
const authMiddleware = require('../middleware/auth-middleware');

// All routes require authentication
router.use(authMiddleware);

// Get approved patients (for job requests)
router.get('/patients/approved', caregiverController.getApprovedPatients);

// Get caregiver dashboard data
router.get('/dashboard', caregiverController.getDashboardData);

// Get caregiver profile
router.get('/profile', caregiverController.getCaregiverProfile);

// Update caregiver profile
router.put('/profile', caregiverController.updateCaregiverProfile);

// Update availability status
router.put('/availability', caregiverController.updateAvailability);

// Heartbeat endpoint to update lastActive
router.post('/heartbeat', caregiverController.updateHeartbeat);

// Explicit location update endpoint
router.post('/update-location', caregiverController.updateLocation);

// Get caregiver bookings (with optional status filter)
router.get('/bookings', caregiverController.getCaregiverBookings);

// Accept booking
router.put('/bookings/:bookingId/accept', caregiverController.acceptBooking);

// Reject booking
router.put('/bookings/:bookingId/reject', caregiverController.rejectBooking);

// Cancel accepted/confirmed booking (caregiver-side rules)
router.put('/bookings/:bookingId/cancel', caregiverController.cancelBooking);

// Update service status (lifecycle)
router.put('/bookings/:bookingId/status', caregiverController.updateServiceStatus);

// Get caregiver earnings
router.get('/earnings', caregiverController.getCaregiverEarnings);

module.exports = router;
