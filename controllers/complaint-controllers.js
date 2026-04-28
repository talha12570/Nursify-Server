const Complaint = require('../modals/complaint-modals');
const Booking = require('../modals/booking-modals');
const Review = require('../modals/review-modals');

const patientSideCategories = [
    'Delayed or Missed Appointment',
    'Inadequate Quality of Care',
    'Unprofessional Conduct',
    'Poor Hygiene or Safety Practice',
    'Clinical Negligence',
    'Early Termination of Visit',
    'Service Disruption',
    'Others'
];

const nurseSideCategories = [
    'Verbal or Behavioral Misconduct',
    'Unsafe or Hostile Environment',
    'Non-Compliance with Instructions',
    'Service Interference',
    'Unauthorized Extension of Duty',
    'Misuse of Platform Services',
    'Repeated Disruptive Behavior',
    'Others'
];

const getBookingReference = (bookingId) => `BK-${bookingId.toString().slice(-8).toUpperCase()}`;

const submitComplaint = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const { category, description } = req.body;
        const trimmedDescription = (description || '').trim();
        const userId = req.user._id;

        if (!category || typeof category !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Complaint category is required'
            });
        }

        const booking = await Booking.findById(bookingId)
            .populate('patient', 'userType')
            .populate('caregiver', 'userType');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        const isPatient = booking.patient?._id?.toString() === userId.toString();
        const isCaregiver = booking.caregiver?._id?.toString() === userId.toString();

        if (!isPatient && !isCaregiver) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to file a complaint for this booking'
            });
        }

        if (booking.status !== 'completed_confirmed') {
            return res.status(400).json({
                success: false,
                message: 'Complaints can only be filed after service completion is confirmed'
            });
        }

        const allowedCategories = isPatient ? patientSideCategories : nurseSideCategories;
        if (!allowedCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid complaint category selected'
            });
        }

        if (category === 'Others' && !trimmedDescription) {
            return res.status(400).json({
                success: false,
                message: 'Please describe your complaint when selecting Others'
            });
        }

        if (trimmedDescription.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'Complaint description cannot exceed 500 characters'
            });
        }

        const existingReview = await Review.findOne({ booking: booking._id, reviewer: userId });
        if (existingReview) {
            return res.status(400).json({
                success: false,
                message: 'You already submitted a review for this booking. Complaint is disabled.'
            });
        }

        const againstUserId = isPatient ? booking.caregiver._id : booking.patient._id;
        const complainantRole = isPatient ? 'patient' : (booking.caregiver?.userType || 'caregiver');
        const againstRole = isPatient ? (booking.caregiver?.userType || 'caregiver') : 'patient';

        const complaint = await Complaint.create({
            booking: booking._id,
            complainant: userId,
            against: againstUserId,
            complainantRole,
            againstRole,
            category,
            description: trimmedDescription,
            status: 'open',
            priority: category === 'Clinical Negligence' ? 'high' : 'medium',
            source: 'post-service-feedback'
        });

        res.status(201).json({
            success: true,
            message: 'Complaint submitted successfully and sent to Safety Monitoring',
            complaint: {
                _id: complaint._id,
                bookingReference: getBookingReference(booking._id),
                category: complaint.category,
                description: complaint.description,
                complainantRole: complaint.complainantRole,
                status: complaint.status,
                adminAction: complaint.adminAction,
                createdAt: complaint.createdAt
            }
        });
    } catch (error) {
        console.error('Submit complaint error:', error);
        next(error);
    }
};

const getAdminComplaints = async (req, res, next) => {
    try {
        const complaints = await Complaint.find({ status: 'open' })
            .populate('complainant', 'fullName userType')
            .populate('against', 'fullName userType')
            .populate('booking', 'status')
            .sort({ createdAt: -1 });

        const formattedComplaints = complaints.map((complaint) => ({
            _id: complaint._id,
            complaintType: complaint.category,
            description: complaint.description || complaint.category,
            userRole: complaint.complainantRole,
            againstRole: complaint.againstRole,
            bookingReference: complaint.booking?._id ? getBookingReference(complaint.booking._id) : 'N/A',
            bookingId: complaint.booking?._id || null,
            bookingStatus: complaint.booking?.status || 'unknown',
            status: complaint.status,
            adminAction: complaint.adminAction,
            priority: complaint.priority,
            reporter: {
                id: complaint.complainant?._id,
                name: complaint.complainant?.fullName || 'Unknown',
                role: complaint.complainant?.userType || complaint.complainantRole
            },
            against: {
                id: complaint.against?._id,
                name: complaint.against?.fullName || 'Unknown',
                role: complaint.against?.userType || complaint.againstRole
            },
            createdAt: complaint.createdAt,
            updatedAt: complaint.updatedAt
        }));

        res.status(200).json({
            success: true,
            count: formattedComplaints.length,
            complaints: formattedComplaints
        });
    } catch (error) {
        console.error('Get admin complaints error:', error);
        next(error);
    }
};

const updateComplaintStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, adminAction } = req.body;

        const update = {};
        if (status) update.status = status;
        if (adminAction) update.adminAction = adminAction;

        const complaint = await Complaint.findByIdAndUpdate(id, update, { new: true });
        if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

        res.status(200).json({ success: true, complaint });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    submitComplaint,
    getAdminComplaints,
    updateComplaintStatus,
    patientSideCategories,
    nurseSideCategories
};
