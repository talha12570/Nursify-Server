const mongoose = require('mongoose');

const URI = process.env.MONGODB_URI;

/**
 * MongoDB connection with optimized settings
 * - Connection pooling for better performance
 * - Auto-reconnection on connection loss
 * - Timeout settings to prevent hanging
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(URI, {
            // Connection pool settings
            maxPoolSize: 10,           // Max connections in pool
            minPoolSize: 2,            // Min connections maintained
            
            // Timeout settings
            serverSelectionTimeoutMS: 5000,  // Timeout for server selection
            socketTimeoutMS: 45000,          // Socket timeout
            connectTimeoutMS: 10000,         // Initial connection timeout
            
            // Heartbeat settings
            heartbeatFrequencyMS: 10000,     // Check connection health
            
            // Write concern
            w: 'majority',                   // Write acknowledgment
            
            // Other optimizations
            maxIdleTimeMS: 30000,            // Close idle connections after 30s
        });
        
        console.log(`MongoDB connected: ${conn.connection.host}`);
        console.log(`Connection pool: min=${2}, max=${10}`);
        
        // Monitor connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });
        
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;