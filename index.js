require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const connectDB = require('./db');
const errorMiddleware = require('./middleware/error-middleware');

// Import routers
const authRouter = require('./router/auth-router');
const patientRouter = require('./router/patient-router');
const caregiverRouter = require('./router/caregiver-router');
const adminRouter = require('./router/admin-router');
const otpRouter = require('./router/otp-router');
const reviewRouter  = require('./router/review-router');
const complaintRouter = require('./router/complaint-router');
const paymentRouter = require('./router/payment-router');
const webhookRouter = require('./router/webhook-router');
const walletRouter  = require('./router/wallet-router');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - Required for ngrok and reverse proxies
app.set('trust proxy', 1);

// Middleware - CORS configured for ngrok
app.use(cors({
    origin: '*', // Allow all origins (ngrok, localhost, etc.)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'ngrok-skip-browser-warning', // Important for ngrok
        'Accept',
        'Origin',
        'X-Requested-With',
        'Cache-Control',
        'X-Forwarded-For',
        'X-Forwarded-Proto'
    ],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400, // Cache preflight for 24 hours
}));

// Additional middleware to ensure ngrok headers are handled
app.use((req, res, next) => {
    // Add CORS headers to every response
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Log incoming requests for debugging
    if (process.env.NODE_ENV !== 'production') {
        console.log(`📥 ${req.method} ${req.path} from ${req.get('origin') || 'unknown'}`);
    }
    next();
});

// Handle preflight requests
app.options('*', cors());

app.use(compression()); // Compress responses

// Capture raw body for MPGS webhook signature verification BEFORE json parsing consumes the stream
app.use(express.json({
    limit: '50mb',
    verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ═══════════════════════════════════════════════════════════════════
// HEALTH CHECK ENDPOINTS (for connectivity testing)
// ═══════════════════════════════════════════════════════════════════

app.get('/', (req, res) => {
    res.json({ 
        status: 'success',
        message: 'Nursify Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
    });
});

// API health check (accessible at /api/health)
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'API is healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
    });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/patient', patientRouter);
app.use('/api/caregiver', caregiverRouter);
app.use('/api/admin', adminRouter);
app.use('/api/otp', otpRouter);
app.use('/api/review',    reviewRouter);
app.use('/api/complaint', complaintRouter);
app.use('/api/payment',   paymentRouter);
app.use('/api/webhooks',  webhookRouter);
app.use('/api/wallet',    walletRouter);

// Error handling middleware (must be last)
app.use(errorMiddleware);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Connect to database and start server
const startServer = async () => {
    try {
        await connectDB();
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`\n✅ Server is running on port ${PORT}`);
            console.log(`🌐 Local: http://localhost:${PORT}`);
            console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
            console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}\n`);
        });
        
        // Set server timeout to 2 minutes for file uploads
        server.timeout = 120000;
        server.keepAliveTimeout = 120000;
        server.headersTimeout = 121000;
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM signal received: closing HTTP server');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 SIGINT signal received: closing HTTP server');
    process.exit(0);
});

startServer();
