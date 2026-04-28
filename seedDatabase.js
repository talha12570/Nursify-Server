// Seed script to populate initial services and sample caregivers
require('dotenv').config();
const ConnectDb = require("./db");
const Service = require("./modals/service-modals");
const Caregiver = require("./modals/caregiver-modals");

const services = [
    {
        name: 'Home Caregiver',
        category: 'caregiving',
        description: 'Professional in-home care for daily living activities, personal hygiene, and companionship',
        icon: 'home',
        color: '#dbeafe',
        iconColor: '#2563eb',
        basePrice: 500,
        displayOrder: 1
    },
    {
        name: 'Hospital Assistant',
        category: 'caregiving',
        description: 'Support services for patients in hospital settings to reduce staff burden',
        icon: 'user',
        color: '#ccfbf1',
        iconColor: '#0d9488',
        basePrice: 600,
        displayOrder: 2
    },
    {
        name: 'IV Therapy',
        category: 'nursing',
        description: 'Professional intravenous therapy and medication administration',
        icon: 'heart',
        color: '#dcfce7',
        iconColor: '#16a34a',
        basePrice: 800,
        displayOrder: 3
    },
    {
        name: 'Wound Care',
        category: 'nursing',
        description: 'Specialized wound dressing and post-operative care',
        icon: 'message',
        color: '#f3e8ff',
        iconColor: '#9333ea',
        basePrice: 750,
        displayOrder: 4
    },
    {
        name: 'ICU Nursing',
        category: 'specialized',
        description: 'Critical care nursing for intensive care patients',
        icon: 'heart',
        color: '#fee2e2',
        iconColor: '#dc2626',
        basePrice: 1200,
        displayOrder: 5
    },
    {
        name: 'Elderly Care',
        category: 'caregiving',
        description: 'Compassionate care for elderly patients with daily activities',
        icon: 'user',
        color: '#fef3c7',
        iconColor: '#f59e0b',
        basePrice: 550,
        displayOrder: 6
    },
    {
        name: 'Dialysis Support',
        category: 'specialized',
        description: 'Specialized nursing care for dialysis patients',
        icon: 'heart',
        color: '#ddd6fe',
        iconColor: '#7c3aed',
        basePrice: 1000,
        displayOrder: 7
    },
    {
        name: 'Post-Surgery Care',
        category: 'nursing',
        description: 'Post-operative monitoring and recovery assistance',
        icon: 'message',
        color: '#fce7f3',
        iconColor: '#ec4899',
        basePrice: 900,
        displayOrder: 8
    }
];

const sampleCaregivers = [
    {
        fullName: 'Sarah Ahmed',
        email: 'sarah.ahmed@example.com',
        phone: '+923001234567',
        userType: 'nurse',
        role: 'Registered Nurse',
        specialization: 'ICU Care',
        licenseNumber: 'RN-2021-5678',
        experience: 5,
        bio: 'Experienced ICU nurse with expertise in critical care and patient monitoring.',
        services: ['ICU Nursing', 'IV Therapy', 'Wound Care'],
        hourlyRate: 800,
        availability: 'available',
        location: {
            type: 'Point',
            coordinates: [74.3587, 31.5204], // Lahore
            address: 'Gulberg, Lahore',
            city: 'Lahore'
        },
        rating: 4.9,
        totalReviews: 124,
        totalBookings: 180,
        completedBookings: 175,
        profileImage: 'https://images.unsplash.com/photo-1643297653753-2d3f459edc6b?w=200',
        verified: true,
        isApproved: true,
        isActive: true,
        languages: ['Urdu', 'English'],
        certifications: [
            {
                name: 'Critical Care Nursing',
                issuedBy: 'PNC',
                issuedDate: new Date('2021-06-15')
            }
        ]
    },
    {
        fullName: 'Dr. Ali Khan',
        email: 'ali.khan@example.com',
        phone: '+923007654321',
        userType: 'caretaker',
        role: 'Medical Caregiver',
        specialization: 'Elderly Care',
        experience: 8,
        bio: 'Compassionate caregiver specializing in elderly patient care with a focus on dignity and comfort.',
        services: ['Elderly Care', 'Home Caregiver', 'Hospital Assistant'],
        hourlyRate: 600,
        availability: 'available',
        location: {
            type: 'Point',
            coordinates: [74.3587, 31.5204],
            address: 'DHA Phase 5, Lahore',
            city: 'Lahore'
        },
        rating: 4.8,
        totalReviews: 98,
        totalBookings: 145,
        completedBookings: 142,
        profileImage: 'https://images.unsplash.com/photo-1758654860020-36fa3fd0dd35?w=200',
        verified: true,
        isApproved: true,
        isActive: true,
        languages: ['Urdu', 'English', 'Punjabi'],
        certifications: []
    },
    {
        fullName: 'Fatima Malik',
        email: 'fatima.malik@example.com',
        phone: '+923009876543',
        userType: 'nurse',
        role: 'Home Nurse',
        specialization: 'Wound Care',
        licenseNumber: 'RN-2019-3456',
        experience: 6,
        bio: 'Skilled home nurse specializing in wound care and post-operative recovery.',
        services: ['Wound Care', 'Post-Surgery Care', 'IV Therapy'],
        hourlyRate: 750,
        availability: 'available',
        location: {
            type: 'Point',
            coordinates: [74.3587, 31.5204],
            address: 'Johar Town, Lahore',
            city: 'Lahore'
        },
        rating: 5.0,
        totalReviews: 156,
        totalBookings: 200,
        completedBookings: 198,
        profileImage: 'https://images.unsplash.com/photo-1758691462477-976f771224d8?w=200',
        verified: true,
        isApproved: true,
        isActive: true,
        languages: ['Urdu', 'English'],
        certifications: [
            {
                name: 'Wound Care Specialist',
                issuedBy: 'PNC',
                issuedDate: new Date('2020-03-20')
            }
        ]
    }
];

async function seedDatabase() {
    try {
        await ConnectDb();
        console.log('Connected to database');

        // Clear existing data
        await Service.deleteMany({});
        await Caregiver.deleteMany({});
        console.log('Cleared existing data');

        // Insert services
        const insertedServices = await Service.insertMany(services);
        console.log(`Inserted ${insertedServices.length} services`);

        // Insert sample caregivers (with dummy userId - you'll need to replace with actual user IDs)
        const caregiverPromises = sampleCaregivers.map(async (caregiver) => {
            return await Caregiver.create({
                ...caregiver,
                userId: '676e4b9a1c8a2f3e4d5b6c7d' // Replace with actual user ID
            });
        });

        await Promise.all(caregiverPromises);
        console.log(`Inserted ${sampleCaregivers.length} sample caregivers`);

        console.log('Database seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();
