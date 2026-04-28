const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient-controllers');
const authMiddleware = require('../middleware/auth-middleware');

// All routes require authentication
router.use(authMiddleware);

// Get approved caregivers (nurses and caretakers)
router.get('/caregivers/approved', patientController.getApprovedCaregivers);

// Get patient dashboard data
router.get('/dashboard', patientController.getDashboardData);

// Get quick services
router.get('/services', patientController.getQuickServices);

// Get nearby caregivers
router.get('/caregivers/nearby', patientController.getNearbyCaregivers);

// Get nearby nurses (privacy-safe distance list, no exact coordinates)
router.get('/nearby-nurses', patientController.getNearbyNurses);

// Search caregivers
router.get('/caregivers/search', patientController.searchCaregivers);

// Search available nurses by name or specialty
router.get('/nurses/search', patientController.searchNurses);

// Get featured/top-rated caregivers
router.get('/caregivers/featured', patientController.getFeaturedCaregivers);

// Favorites management
router.post('/favorites', patientController.addFavoriteCaregiver);
router.delete('/favorites/:caregiverId', patientController.removeFavoriteCaregiver);
router.get('/favorites', patientController.getFavoriteCaregivers);

// Get specific caregiver by ID (detailed profile)
router.get('/caregivers/detail/:caregiverId', patientController.getCaregiverById);

// Get specific caregiver profile
router.get('/caregivers/:id', patientController.getCaregiverProfile);

// Booking management
router.post('/bookings/check-availability', patientController.checkNurseAvailability);
router.post('/bookings', patientController.createBooking);
router.get('/bookings', patientController.getPatientBookings);
router.get('/bookings/:bookingId', patientController.getBookingById);
router.put('/bookings/:bookingId', patientController.updateBooking);
router.put('/bookings/:bookingId/cancel', patientController.cancelBooking);
router.delete('/bookings/:bookingId', patientController.cancelBooking);
router.put('/bookings/:bookingId/confirm-completion', patientController.confirmServiceCompletion);

// Real-time nurse location during on_the_way phase
router.get('/bookings/:bookingId/nurse-location', patientController.getNurseLocation);

module.exports = router;
