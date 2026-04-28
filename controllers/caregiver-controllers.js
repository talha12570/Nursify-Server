const mongoose = require('mongoose');
const User = require("../modals/user-modals");
const Booking = require("../modals/booking-modals");
const { getEffectivePricing, isPricingEligible } = require('../utils/pricing');

const BOOKING_SLOT_LOCK_STATUSES = [
    'accepted',
    'approved',
    'confirmed',
    'on_the_way',
    'arrived',
    'service_started',
    'service_completed',
    'completed_confirmed'
];

const toPositiveNumberOrNull = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

// Get approved patients for caregiver dashboard
const getApprovedPatients = async (req, res, next) => {
    try {
        const { limit = 10 } = req.query;
        
        const query = {
            userType: 'patient',
            isApproved: true,
            isVerified: true
        };

        const patients = await User.find(query)
            .select('fullName email phone userType')
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        // Transform data to match frontend expectations (mock job requests from patients)
        const formattedJobRequests = patients.map((patient, index) => ({
            id: patient._id.toString(),
            patient: patient.fullName,
            service: ['ICU Care', 'Elderly Care', 'Wound Care', 'Home Care', 'Post-Surgery Care'][index % 5],
            date: 'Today',
            time: ['3:00 PM', '5:00 PM', '10:00 AM', '2:00 PM', '7:00 PM'][index % 5],
            duration: ['4 hours', '2 hours', '6 hours', '3 hours', '5 hours'][index % 5],
            location: ['DHA Phase 2, Lahore', 'Gulberg, Lahore', 'Model Town, Lahore', 'Johar Town, Lahore', 'Bahria Town, Lahore'][index % 5],
            distance: ['2.3 km', '4.1 km', '1.8 km', '3.5 km', '5.2 km'][index % 5],
            payment: ['Rs. 3,200', 'Rs. 1,600', 'Rs. 2,400', 'Rs. 4,000', 'Rs. 2,800'][index % 5],
            status: 'pending',
            patientEmail: patient.email,
            patientPhone: patient.phone
        }));

        res.status(200).json({
            success: true,
            count: formattedJobRequests.length,
            jobRequests: formattedJobRequests
        });
    } catch (error) {
        console.error("Error fetching patients:", error);
        next(error);
    }
};

// Get caregiver dashboard data
const getDashboardData = async (req, res, next) => {
    try {
        const userId = req.user._id; // from auth middleware
        
        // Update lastActive timestamp for the caregiver
        await User.findByIdAndUpdate(userId, { lastActive: new Date() });
        
        // Get user info
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        // Get total patients count
        const totalPatients = await User.countDocuments({ 
            userType: 'patient',
            isApproved: true,
            isVerified: true
        });

        res.status(200).json({
            success: true,
            user: {
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                userType: user.userType,
                specialty: user.specialty,
                licenseNumber: user.licenseNumber,
                professionalImage: user.professionalImage
            },
            stats: {
                totalPatients,
                pendingJobs: 0, // TODO: Implement real booking system
                completedJobs: 0, // TODO: Implement real booking system
                earnings: 0 // TODO: Implement real payment system
            }
        });
    } catch (error) {
        console.error("Error fetching caregiver dashboard data:", error);
        next(error);
    }
};

// Get caregiver profile
const getCaregiverProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        
        const user = await User.findById(userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        // Check if profile fields exist
        const hasProfile = user.workExperience || user.about || user.institution || user.licenseType;
        
        if (!hasProfile) {
            return res.status(200).json({
                success: true,
                message: "Profile not set up yet",
                profile: {
                    isAvailable: user.isAvailable !== undefined ? user.isAvailable : true,
                }
            });
        }

        const { PRICING } = require('../utils/pricing');

        const pricing = getEffectivePricing(user);

        res.status(200).json({
            success: true,
            profile: {
                workExperience: user.workExperience,
                about: user.about,
                education: user.education,
                institution: user.institution,
                licenseType: user.licenseType,
                pricingEligible: pricing.eligible,
                pricingOverrides: pricing.eligible ? (user.pricingOverrides || {}) : null,
                pricing: {
                    hourly: pricing.hourly,
                    daily4: pricing.daily4,
                    daily6: pricing.daily6,
                    weekly1: pricing.weekly1,
                    weekly2: pricing.weekly2,
                    weekly3: pricing.weekly3,
                },
                isAvailable: user.isAvailable !== undefined ? user.isAvailable : true,
            }
        });
    } catch (error) {
        console.error("Error fetching caregiver profile:", error);
        next(error);
    }
};

// Update caregiver profile
const updateCaregiverProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const {
            workExperience,
            about,
            education,
            institution,
            licenseType,
            pricingOverrides
        } = req.body;

        // Validate required fields
        if (!about || !workExperience || !institution || !licenseType) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields (about, workExperience, institution, licenseType)"
            });
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const pricingEligible = isPricingEligible(user);
        const normalizedOverrides = pricingEligible && pricingOverrides ? {
            hourly: toPositiveNumberOrNull(pricingOverrides.hourly),
            daily4: toPositiveNumberOrNull(pricingOverrides.daily4),
            daily6: toPositiveNumberOrNull(pricingOverrides.daily6),
            weekly1: toPositiveNumberOrNull(pricingOverrides.weekly1),
            weekly2: toPositiveNumberOrNull(pricingOverrides.weekly2),
            weekly3: toPositiveNumberOrNull(pricingOverrides.weekly3),
        } : null;

        const updatePayload = {
            workExperience,
            about,
            education,
            institution,
            licenseType,
        };

        if (normalizedOverrides) {
            updatePayload.pricingOverrides = normalizedOverrides;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updatePayload,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const updatedPricing = getEffectivePricing(updatedUser);

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            profile: {
                workExperience: updatedUser.workExperience,
                about: updatedUser.about,
                education: updatedUser.education,
                institution: updatedUser.institution,
                licenseType: updatedUser.licenseType,
                pricingEligible: updatedPricing.eligible,
                pricingOverrides: updatedPricing.eligible ? (updatedUser.pricingOverrides || {}) : null,
                pricing: {
                    hourly: updatedPricing.hourly,
                    daily4: updatedPricing.daily4,
                    daily6: updatedPricing.daily6,
                    weekly1: updatedPricing.weekly1,
                    weekly2: updatedPricing.weekly2,
                    weekly3: updatedPricing.weekly3,
                },
            }
        });
    } catch (error) {
        console.error("Error updating caregiver profile:", error);
        next(error);
    }
};

// Update availability status
const updateAvailability = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { isAvailable, latitude, longitude, accuracy } = req.body;

        if (typeof isAvailable !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: "isAvailable must be a boolean value"
            });
        }

        const updatePayload = {
            isAvailable,
            lastActive: new Date(),
        };

        // Prevent "online but invisible" state in patient nearby listings.
        // Nearby search requires a recent, valid GPS fix; block going online without it.
        if (isAvailable === true) {
            const userForLocationCheck = await User.findById(userId)
                .select('location locationUpdatedAt locationAccuracy')
                .lean();

            const coords = userForLocationCheck?.location?.coordinates;
            const hasCoords = Array.isArray(coords) && coords.length >= 2;
            const lng = hasCoords ? Number(coords[0]) : NaN;
            const lat = hasCoords ? Number(coords[1]) : NaN;
            let hasValidNumericCoords = Number.isFinite(lat) && Number.isFinite(lng);
            let isZeroCoordinate = hasValidNumericCoords && Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001;
            let isRecentLocation =
                userForLocationCheck?.locationUpdatedAt &&
                Date.now() - new Date(userForLocationCheck.locationUpdatedAt).getTime() <= 2 * 60 * 1000;

            // Accept a live GPS sample sent with the availability toggle request itself.
            const parsedLat = parseFloat(latitude);
            const parsedLng = parseFloat(longitude);
            const parsedAcc = parseFloat(accuracy);
            const incomingCoordsValid = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);
            const incomingAccuracyOk =
                !Number.isFinite(parsedAcc) || parsedAcc <= MAX_ONLINE_TOGGLE_ACCURACY_M;
            const incomingZeroCoordinate =
                incomingCoordsValid && Math.abs(parsedLat) < 0.0001 && Math.abs(parsedLng) < 0.0001;

            if (incomingCoordsValid && incomingAccuracyOk && !incomingZeroCoordinate) {
                const guarded = applyLocationGuards({
                    oldCoords: userForLocationCheck?.location?.coordinates,
                    oldUpdatedAt: userForLocationCheck?.locationUpdatedAt,
                    oldAccuracy: userForLocationCheck?.locationAccuracy,
                    parsedLat,
                    parsedLng,
                    parsedAcc,
                });

                if (guarded.accepted) {
                    updatePayload.location = {
                        type: 'Point',
                        coordinates: guarded.coordinates,
                    };
                    updatePayload.locationUpdatedAt = new Date();
                    if (Number.isFinite(guarded.accuracy)) {
                        updatePayload.locationAccuracy = guarded.accuracy;
                    }
                    hasValidNumericCoords = true;
                    isZeroCoordinate = false;
                    isRecentLocation = true;
                } else {
                    updatePayload.locationUpdatedAt = new Date();
                    if (Number.isFinite(guarded.refineAccuracy)) {
                        updatePayload.locationAccuracy = guarded.refineAccuracy;
                    }
                    isRecentLocation = true;
                }
            }

            // If we already have a valid non-zero stored location but its timestamp is stale,
            // allow going online and refresh freshness. Heartbeats will refine position immediately.
            if (hasValidNumericCoords && !isZeroCoordinate && !isRecentLocation) {
                updatePayload.locationUpdatedAt = new Date();
                isRecentLocation = true;
            }

            if (!hasValidNumericCoords || isZeroCoordinate || !isRecentLocation) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Enable location and wait for a valid GPS fix before going online.',
                });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updatePayload,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: `Availability updated to ${isAvailable ? 'available' : 'unavailable'}`,
            isAvailable: updatedUser.isAvailable
        });
    } catch (error) {
        console.error("Error updating availability:", error);
        next(error);
    }
};

// Get bookings for caregiver (filtered by status)
const getCaregiverBookings = async (req, res, next) => {
    try {
        const caregiverId = req.user._id;
        const { status } = req.query;

        const query = { caregiver: caregiverId };
        if (status) {
            query.status = status;
        }

        const bookings = await Booking.find(query)
            .populate('patient', 'fullName email phone location')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (error) {
        console.error("Error fetching caregiver bookings:", error);
        next(error);
    }
};

// Accept a booking request
const acceptBooking = async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
        const { bookingId } = req.params;
        const caregiverId = req.user._id;

        session.startTransaction();

        const booking = await Booking.findOne({ 
            _id: bookingId,
            caregiver: caregiverId,
            status: 'pending'
        }).session(session);

        if (!booking) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: "Booking not found or no longer pending"
            });
        }

        // Lock the slot only if there is no already-accepted/in-progress overlap.
        const lockedOverlap = await Booking.findOne({
            caregiver: caregiverId,
            _id: { $ne: booking._id },
            status: { $in: BOOKING_SLOT_LOCK_STATUSES },
            startDateTime: { $lt: booking.endDateTime },
            endDateTime: { $gt: booking.startDateTime }
        }).select('_id status').session(session);

        if (lockedOverlap) {
            await session.abortTransaction();
            return res.status(409).json({
                success: false,
                message: 'This time slot has already been accepted for another booking.'
            });
        }

        // Move selected request to accepted and reject all overlapping pending requests.
        booking.status = 'accepted';
        await booking.save({ session });

        await Booking.updateMany(
            {
                caregiver: caregiverId,
                _id: { $ne: booking._id },
                status: 'pending',
                startDateTime: { $lt: booking.endDateTime },
                endDateTime: { $gt: booking.startDateTime }
            },
            {
                $set: {
                    status: 'rejected',
                    cancellationReason: 'Auto-rejected: nurse accepted another request for the same slot.'
                }
            },
            { session }
        );

        await session.commitTransaction();

        const populatedBooking = await Booking.findById(bookingId)
            .populate('patient', 'fullName email phone');

        res.status(200).json({
            success: true,
            message: "Booking accepted and slot locked.",
            booking: populatedBooking
        });
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error("Error accepting booking:", error);
        next(error);
    } finally {
        session.endSession();
    }
};

// Reject a booking request
const rejectBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const caregiverId = req.user._id;
        const { reason } = req.body;

        const booking = await Booking.findOne({ 
            _id: bookingId,
            caregiver: caregiverId 
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        if (booking.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot reject booking with status: ${booking.status}`
            });
        }

        booking.status = 'rejected';
        if (reason) {
            booking.cancellationReason = reason;
        }
        await booking.save();

        const populatedBooking = await Booking.findById(bookingId)
            .populate('patient', 'fullName email phone');

        res.status(200).json({
            success: true,
            message: "Booking rejected",
            booking: populatedBooking
        });
    } catch (error) {
        console.error("Error rejecting booking:", error);
        next(error);
    }
};

// Cancel booking (caregiver side, role-specific rules)
const cancelBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const caregiverId = req.user._id;
        const { reason } = req.body;

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found.'
            });
        }

        if (booking.caregiver.toString() !== caregiverId.toString() && booking.patient.toString() !== caregiverId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You are not a party to this booking.'
            });
        }

        if (booking.caregiver.toString() !== caregiverId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You are not a party to this booking.'
            });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'This booking has already been cancelled.'
            });
        }

        if (booking.status === 'rejected') {
            return res.status(400).json({
                success: false,
                message: 'This booking was already rejected.'
            });
        }

        if (booking.status === 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Use the reject action to decline a pending booking request.'
            });
        }

        const hardBlockedStatuses = ['on_the_way', 'arrived', 'service_started', 'service_completed', 'completed_confirmed'];
        if (hardBlockedStatuses.includes(booking.status)) {
            return res.status(400).json({
                success: false,
                message: 'You cannot cancel while en route. Please complete the visit.'
            });
        }

        if (!reason || !String(reason).trim()) {
            return res.status(400).json({
                success: false,
                message: 'A cancellation reason is required.'
            });
        }

        const previousStatus = booking.status;

        booking.status = 'cancelled';
        booking.cancelledBy = 'caregiver';
        booking.cancelledByUser = caregiverId;
        booking.cancelledAt = new Date();
        booking.cancellationReason = String(reason).trim();
        booking.refundStatus = 'not_applicable';
        // Penalty applies only when caregiver cancels an already confirmed booking.
        booking.penaltyFlag = ['accepted', 'confirmed'].includes(previousStatus);

        await booking.save();

        const populatedBooking = await Booking.findById(bookingId)
            .populate('patient', 'fullName email phone')
            .populate('caregiver', 'fullName email phone');

        return res.status(200).json({
            success: true,
            message: 'Booking cancelled successfully.',
            booking: populatedBooking
        });
    } catch (error) {
        console.error('Error cancelling booking (caregiver):', error);
        next(error);
    }
};

// Update service status (for service lifecycle)
const updateServiceStatus = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const caregiverId = req.user._id;
        const { status } = req.body;

        const booking = await Booking.findOne({ 
            _id: bookingId,
            caregiver: caregiverId 
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }

        // Validate status transitions
        const validTransitions = {
            'approved': ['on_the_way'],
            'accepted': ['on_the_way'],
            'confirmed': ['on_the_way'],
            'on_the_way': ['arrived'],
            'arrived': ['service_started'],
            'service_started': ['service_completed'],
        };

        const allowedNextStatuses = validTransitions[booking.status];
        
        if (!allowedNextStatuses || !allowedNextStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot transition from ${booking.status} to ${status}`
            });
        }

        // Update status and set timestamp
        booking.status = status;
        const now = new Date();

        switch(status) {
            case 'on_the_way':
                booking.onTheWayAt = now;
                break;
            case 'arrived':
                booking.arrivedAt = now;
                break;
            case 'service_started':
                booking.serviceStartedAt = now;
                break;
            case 'service_completed':
                booking.serviceCompletedAt = now;
                break;
        }

        await booking.save();

        const populatedBooking = await Booking.findById(bookingId)
            .populate('patient', 'fullName email phone location')
            .populate('caregiver', 'fullName email phone professionalImage');

        res.status(200).json({
            success: true,
            message: "Service status updated successfully",
            booking: populatedBooking
        });
    } catch (error) {
        console.error("Error updating service status:", error);
        next(error);
    }
};

// Get caregiver earnings
const getCaregiverEarnings = async (req, res, next) => {
    try {
        const caregiverId = req.user._id;
        const { period = 'today' } = req.query; // today, week, month, all

        let dateFilter = {};
        const now = new Date();

        switch(period) {
            case 'today':
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                dateFilter = { completedConfirmedAt: { $gte: startOfDay } };
                break;
            case 'week':
                const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                dateFilter = { completedConfirmedAt: { $gte: startOfWeek } };
                break;
            case 'month':
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                dateFilter = { completedConfirmedAt: { $gte: startOfMonth } };
                break;
            case 'all':
                dateFilter = {};
                break;
        }

        // Get completed and confirmed bookings
        const completedBookings = await Booking.find({
            caregiver: caregiverId,
            status: 'completed_confirmed',
            ...dateFilter
        }).populate('patient', 'fullName');

        // Calculate totals
        const totalEarnings = completedBookings.reduce((sum, booking) => sum + (booking.amount || 0), 0);
        const totalJobs = completedBookings.length;
        
        // Calculate total hours (assuming 1 hour per booking if not specified)
        const totalHours = completedBookings.reduce((sum, booking) => {
            // Extract hours from duration or default to 1
            if (booking.serviceStartedAt && booking.serviceCompletedAt) {
                const duration = (booking.serviceCompletedAt - booking.serviceStartedAt) / (1000 * 60 * 60);
                return sum + duration;
            }
            return sum + 1; // default 1 hour
        }, 0);

        res.status(200).json({
            success: true,
            period,
            earnings: {
                total: Math.round(totalEarnings),
                jobs: totalJobs,
                hours: Math.round(totalHours * 10) / 10 // round to 1 decimal
            },
            bookings: completedBookings.map(b => ({
                id: b._id,
                patient: b.patient?.fullName || 'N/A',
                serviceType: b.serviceType,
                date: b.date,
                amount: b.amount,
                completedAt: b.completedConfirmedAt
            }))
        });
    } catch (error) {
        console.error("Error fetching caregiver earnings:", error);
        next(error);
    }
};

// ── Heartbeat GPS tuning ───────────────────────────────────────────────────
const MAX_SAVE_ACCURACY_M = 60;          // heartbeat/location endpoint quality threshold
const MAX_ONLINE_TOGGLE_ACCURACY_M = 150; // allow coarse first fix when turning online
const STATIONARY_DRIFT_M = 15;           // ignore tiny drift while device is still
const MAX_PLAUSIBLE_SPEED_MPS = 40;      // reject unrealistic jumps (about 144 km/h)
const TELEPORT_GUARD_DISTANCE_M = 220;   // large jump threshold for speed validation
const EMA_ALPHA_HEARTBEAT = 0.35;        // light smoothing to reduce jitter without major lag
const EMA_SMOOTH_UNTIL_M = 150;          // smooth only small/medium movement

const toRad = (deg) => (deg * Math.PI) / 180;
const distanceMetersBetween = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const applyLocationGuards = ({ oldCoords, oldUpdatedAt, oldAccuracy, parsedLat, parsedLng, parsedAcc }) => {
    const hasOld = Array.isArray(oldCoords) && oldCoords.length >= 2;
    if (!hasOld) {
        return {
            accepted: true,
            coordinates: [parsedLng, parsedLat],
            accuracy: Number.isFinite(parsedAcc) ? parsedAcc : null,
        };
    }

    const oldLng = Number(oldCoords[0]);
    const oldLat = Number(oldCoords[1]);
    if (!Number.isFinite(oldLng) || !Number.isFinite(oldLat)) {
        return {
            accepted: true,
            coordinates: [parsedLng, parsedLat],
            accuracy: Number.isFinite(parsedAcc) ? parsedAcc : null,
        };
    }

    // Treat legacy/sentinel [0,0] as invalid baseline and accept first real GPS point.
    const oldIsZeroCoordinate = Math.abs(oldLat) < 0.0001 && Math.abs(oldLng) < 0.0001;
    if (oldIsZeroCoordinate) {
        return {
            accepted: true,
            coordinates: [parsedLng, parsedLat],
            accuracy: Number.isFinite(parsedAcc) ? parsedAcc : null,
        };
    }

    const movementM = distanceMetersBetween(oldLat, oldLng, parsedLat, parsedLng);
    const nextAcc = Number.isFinite(parsedAcc) ? parsedAcc : Number.POSITIVE_INFINITY;
    const prevAcc = Number.isFinite(oldAccuracy) ? oldAccuracy : Number.POSITIVE_INFINITY;
    const dynamicDriftM = Math.max(STATIONARY_DRIFT_M, Math.min(25, nextAcc * 0.6));

    if (movementM <= dynamicDriftM) {
        return {
            accepted: false,
            keepOld: true,
            refineAccuracy: nextAcc < prevAcc ? nextAcc : null,
        };
    }

    const nowMs = Date.now();
    const oldMs = oldUpdatedAt ? new Date(oldUpdatedAt).getTime() : nowMs - 2000;
    const elapsedS = Math.max(1, (nowMs - oldMs) / 1000);
    const speedMps = movementM / elapsedS;

    if (movementM >= TELEPORT_GUARD_DISTANCE_M && speedMps > MAX_PLAUSIBLE_SPEED_MPS) {
        return {
            accepted: false,
            keepOld: true,
            refineAccuracy: nextAcc < prevAcc ? nextAcc : null,
        };
    }

    if (movementM <= EMA_SMOOTH_UNTIL_M) {
        const smoothedLat = oldLat * (1 - EMA_ALPHA_HEARTBEAT) + parsedLat * EMA_ALPHA_HEARTBEAT;
        const smoothedLng = oldLng * (1 - EMA_ALPHA_HEARTBEAT) + parsedLng * EMA_ALPHA_HEARTBEAT;
        return {
            accepted: true,
            coordinates: [smoothedLng, smoothedLat],
            accuracy: Number.isFinite(parsedAcc) ? parsedAcc : null,
        };
    }

    return {
        accepted: true,
        coordinates: [parsedLng, parsedLat],
        accuracy: Number.isFinite(parsedAcc) ? parsedAcc : null,
    };
};

// Heartbeat endpoint to update lastActive (and optionally location)
const updateHeartbeat = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { latitude, longitude, accuracy } = req.body;

        const update = { lastActive: new Date() };

        const parsedLat = parseFloat(latitude);
        const parsedLng = parseFloat(longitude);
        const parsedAcc = parseFloat(accuracy);
        const coordsValid = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);
        const accuracyOk  = !Number.isFinite(parsedAcc) || parsedAcc <= MAX_SAVE_ACCURACY_M;
        const zeroCoordinate =
            coordsValid && Math.abs(parsedLat) < 0.0001 && Math.abs(parsedLng) < 0.0001;

        if (coordsValid && accuracyOk && !zeroCoordinate) {
            const current = await User.findById(userId, 'location locationUpdatedAt locationAccuracy').lean();
            const guarded = applyLocationGuards({
                oldCoords: current?.location?.coordinates,
                oldUpdatedAt: current?.locationUpdatedAt,
                oldAccuracy: current?.locationAccuracy,
                parsedLat,
                parsedLng,
                parsedAcc,
            });

            if (guarded.accepted) {
                update.location = {
                    type: 'Point',
                    coordinates: guarded.coordinates,
                };
                update.locationUpdatedAt = new Date();
                if (Number.isFinite(guarded.accuracy)) update.locationAccuracy = guarded.accuracy;
            } else {
                // Keep the last good location "fresh" even when current sample is stationary jitter.
                // Otherwise nearby query drops the nurse after 2 minutes despite active heartbeats.
                update.locationUpdatedAt = new Date();
                if (Number.isFinite(guarded.refineAccuracy)) {
                    update.locationAccuracy = guarded.refineAccuracy;
                }
            }
        }

        await User.findByIdAndUpdate(userId, update);

        res.status(200).json({
            success: true,
            message: 'Activity updated',
        });
    } catch (error) {
        console.error('Error updating heartbeat:', error);
        next(error);
    }
};

// Explicit endpoint to update caregiver location continuously.
const updateLocation = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { latitude, longitude, accuracy } = req.body;

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const acc = parseFloat(accuracy);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return res.status(400).json({
                success: false,
                message: 'latitude and longitude are required numeric values.',
            });
        }

        if (Number.isFinite(acc) && acc > MAX_SAVE_ACCURACY_M) {
            return res.status(200).json({
                success: true,
                message: 'Location sample ignored due to low GPS accuracy.',
            });
        }

        const current = await User.findById(userId, 'location locationUpdatedAt locationAccuracy').lean();
        const guarded = applyLocationGuards({
            oldCoords: current?.location?.coordinates,
            oldUpdatedAt: current?.locationUpdatedAt,
            oldAccuracy: current?.locationAccuracy,
            parsedLat: lat,
            parsedLng: lng,
            parsedAcc: acc,
        });

        if (!guarded.accepted) {
            const passiveUpdate = { lastActive: new Date() };
            passiveUpdate.locationUpdatedAt = new Date();
            if (Number.isFinite(guarded.refineAccuracy)) {
                passiveUpdate.locationAccuracy = guarded.refineAccuracy;
            }
            await User.findByIdAndUpdate(userId, passiveUpdate);
            return res.status(200).json({
                success: true,
                message: 'Location sample ignored to prevent jitter.',
            });
        }

        await User.findByIdAndUpdate(userId, {
            lastActive: new Date(),
            location: {
                type: 'Point',
                coordinates: guarded.coordinates,
            },
            locationUpdatedAt: new Date(),
            ...(Number.isFinite(guarded.accuracy) ? { locationAccuracy: guarded.accuracy } : {}),
        });

        return res.status(200).json({
            success: true,
            message: 'Location updated successfully.',
        });
    } catch (error) {
        console.error('Error updating caregiver location:', error);
        next(error);
    }
};

module.exports = {
    getApprovedPatients,
    getDashboardData,
    getCaregiverProfile,
    updateCaregiverProfile,
    updateAvailability,
    getCaregiverBookings,
    acceptBooking,
    rejectBooking,
    cancelBooking,
    updateServiceStatus,
    getCaregiverEarnings,
    updateHeartbeat,
    updateLocation
};
