require('dotenv').config();
const mongoose = require('mongoose');
const http = require('http');
const transport = require('./config/emailTransport');

const SERVER_IP = process.env.SERVER_IP || '192.168.0.119';
const SERVER_PORT = '5000';

console.log('\n');
console.log('═══════════════════════════════════════════════════════════');
console.log('          🔍 NURSIFY SYSTEM HEALTH CHECK');
console.log('═══════════════════════════════════════════════════════════');
console.log('\n');

const checks = {
    mongodb: false,
    smtp: false,
    server: false,
    users: 0,
    tokens: 0
};

// 1. Check MongoDB Connection
const checkMongoDB = async () => {
    console.log('📊 1. MONGODB CONNECTION');
    console.log('───────────────────────────────────────────────────────────');
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('✅ Status: CONNECTED');
        console.log('📍 Host:', mongoose.connection.host);
        console.log('🗄️  Database:', mongoose.connection.name);
        checks.mongodb = true;
        
        // Count users
        const User = require('./modals/user-modals');
        const EmailVerificationToken = require('./modals/EmailVerificationToken');
        
        checks.users = await User.countDocuments();
        checks.tokens = await EmailVerificationToken.countDocuments();
        
        console.log('👥 Total Users:', checks.users);
        console.log('🔑 Active OTP Tokens:', checks.tokens);
        
    } catch (error) {
        console.log('❌ Status: FAILED');
        console.log('❌ Error:', error.message);
        checks.mongodb = false;
    }
    console.log('───────────────────────────────────────────────────────────\n');
};

// 2. Check SMTP Configuration
const checkSMTP = () => {
    return new Promise((resolve) => {
        console.log('📧 2. SMTP EMAIL SERVICE');
        console.log('───────────────────────────────────────────────────────────');
        console.log('📮 Host:', process.env.SMTP_HOST);
        console.log('🔌 Port:', process.env.SMTP_PORT);
        console.log('👤 User:', process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 10) + '***' : 'NOT SET');
        console.log('🔐 Pass:', process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.substring(process.env.SMTP_PASS.length - 3) : 'NOT SET');
        
        transport.verify()
            .then(() => {
                console.log('✅ Status: CONNECTED');
                console.log('📬 Email service is operational');
                checks.smtp = true;
                console.log('───────────────────────────────────────────────────────────\n');
                resolve();
            })
            .catch(err => {
                console.log('❌ Status: FAILED');
                console.log('❌ Error:', err.message);
                checks.smtp = false;
                console.log('───────────────────────────────────────────────────────────\n');
                resolve();
            });
    });
};

// 3. Check Server Status
const checkServer = () => {
    return new Promise((resolve) => {
        console.log('🚀 3. BACKEND SERVER');
        console.log('───────────────────────────────────────────────────────────');
        console.log('🌐 IP:', SERVER_IP);
        console.log('🔌 Port:', SERVER_PORT);
        console.log('📍 URL:', `http://${SERVER_IP}:${SERVER_PORT}`);
        
        const options = {
            hostname: 'localhost',
            port: SERVER_PORT,
            path: '/',
            method: 'GET',
            timeout: 3000
        };

        const req = http.request(options, (res) => {
            console.log('✅ Status: RUNNING');
            console.log('📡 Response Code:', res.statusCode);
            checks.server = true;
            console.log('───────────────────────────────────────────────────────────\n');
            resolve();
        });

        req.on('error', () => {
            console.log('❌ Status: NOT RUNNING');
            console.log('⚠️  Action Required: Start server with "npm start"');
            checks.server = false;
            console.log('───────────────────────────────────────────────────────────\n');
            resolve();
        });

        req.on('timeout', () => {
            console.log('❌ Status: TIMEOUT');
            checks.server = false;
            req.destroy();
            console.log('───────────────────────────────────────────────────────────\n');
            resolve();
        });

        req.end();
    });
};

// 4. Environment Variables
const checkEnv = () => {
    console.log('⚙️  4. ENVIRONMENT CONFIGURATION');
    console.log('───────────────────────────────────────────────────────────');
    const required = [
        'MONGODB_URI',
        'JWT_SECRET_KEY',
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASS',
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET',
        'SERVER_IP'
    ];
    
    let allSet = true;
    required.forEach(key => {
        const value = process.env[key];
        if (value) {
            console.log(`✅ ${key}: SET`);
        } else {
            console.log(`❌ ${key}: MISSING`);
            allSet = false;
        }
    });
    
    if (allSet) {
        console.log('\n✅ All required environment variables are set');
    } else {
        console.log('\n⚠️  Some environment variables are missing');
    }
    console.log('───────────────────────────────────────────────────────────\n');
};

// Run all checks
const runAllChecks = async () => {
    await checkMongoDB();
    await checkSMTP();
    await checkServer();
    checkEnv();
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                  📋 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('MongoDB:', checks.mongodb ? '✅ Connected' : '❌ Disconnected');
    console.log('SMTP:', checks.smtp ? '✅ Connected' : '❌ Disconnected');
    console.log('Server:', checks.server ? '✅ Running' : '❌ Not Running');
    console.log('Users:', checks.users);
    console.log('OTP Tokens:', checks.tokens);
    console.log('───────────────────────────────────────────────────────────');
    
    const allGood = checks.mongodb && checks.smtp && checks.server;
    if (allGood) {
        console.log('\n🎉 ALL SYSTEMS OPERATIONAL!');
        console.log('Your Nursify backend is ready to serve requests.\n');
    } else {
        console.log('\n⚠️  SOME SYSTEMS NEED ATTENTION');
        console.log('Please fix the issues marked with ❌ above.\n');
    }
    console.log('═══════════════════════════════════════════════════════════\n');
    
    mongoose.connection.close();
    process.exit(0);
};

runAllChecks();
