#!/usr/bin/env node
/**
 * Automated Ngrok + Server Startup Script
 * 
 * This script:
 * 1. Starts ngrok tunnel to port 5000 using Node.js ngrok package
 * 2. Fetches the public URL
 * 3. Updates all configuration files automatically
 * 4. Starts the Express server
 * 
 * Usage: npm run ngrok (in Server folder)
 */

const { spawn } = require('child_process');
const ngrok = require('ngrok');
const fs = require('fs');
const path = require('path');

const SERVER_PORT = 5000;

// File paths
const ROOT_DIR = path.join(__dirname, '..');
const APP_DIR = path.join(ROOT_DIR, '..', 'App');
const APP_ENV_PATH = path.join(APP_DIR, '.env');
const APP_CONFIG_PATH = path.join(APP_DIR, 'config', 'api.js');
const NGROK_URL_FILE = path.join(ROOT_DIR, '.ngrok-url');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║           NURSIFY - NGROK AUTO-STARTUP SCRIPT              ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

// Update App .env file
function updateAppEnv(ngrokUrl) {
    console.log('📝 Updating App/.env...');
    
    const envContent = `# ═══════════════════════════════════════════════════════════════════
# NURSIFY APP ENVIRONMENT CONFIGURATION
# ═══════════════════════════════════════════════════════════════════
# 
# ⚠️ AUTO-GENERATED - DO NOT EDIT MANUALLY
# This file is updated by Server/scripts/start-with-ngrok.js
# Generated: ${new Date().toISOString()}
# ═══════════════════════════════════════════════════════════════════

# Ngrok URL (works on ANY network - WiFi, mobile data, anywhere)
EXPO_PUBLIC_API_URL=${ngrokUrl}/api
EXPO_PUBLIC_BASE_URL=${ngrokUrl}
`;
    
    fs.writeFileSync(APP_ENV_PATH, envContent);
    console.log('   ✓ Updated EXPO_PUBLIC_API_URL');
    console.log('   ✓ Updated EXPO_PUBLIC_BASE_URL');
}

// Update App config/api.js
function updateAppConfig(ngrokUrl) {
    console.log('📝 Updating App/config/api.js...');
    
    const configContent = `/**
 * Global API Configuration
 * 
 * ⚠️ AUTO-GENERATED - DO NOT EDIT MANUALLY
 * This file is updated automatically by Server/scripts/start-with-ngrok.js
 * 
 * Current Mode: NGROK (works on any network)
 * Generated: ${new Date().toISOString()}
 */

// ═══════════════════════════════════════════════════════════════════
// NGROK URL - Auto-updated on server start
// ═══════════════════════════════════════════════════════════════════
const NGROK_URL = process.env.EXPO_PUBLIC_BASE_URL || '${ngrokUrl}';

// ═══════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════
export const API_URL = \`\${NGROK_URL}/api\`;
export const BASE_URL = NGROK_URL;
export const HEALTH_CHECK_URL = \`\${NGROK_URL}/api/health\`;

// For backward compatibility
export const SERVER_CONFIG = {
  ngrokUrl: NGROK_URL,
  apiUrl: API_URL,
  baseUrl: BASE_URL,
};

// ═══════════════════════════════════════════════════════════════════
// NETWORK CONFIGURATION
// ═══════════════════════════════════════════════════════════════════
export const NETWORK_CONFIG = {
  // Timeout settings (in milliseconds)
  timeout: {
    default: 15000,      // 15 seconds for normal requests
    upload: 120000,      // 2 minutes for file uploads
    health: 5000,        // 5 seconds for health checks
  },
  
  // Retry settings
  retry: {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
  },
  
  // Headers required for ngrok (skip browser warning)
  ngrokHeaders: {
    'ngrok-skip-browser-warning': 'true',
  },
};

// Log the configuration in development
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('📡 API Configuration:', {
    API_URL,
    BASE_URL,
    NGROK_URL,
  });
}

export default {
  API_URL,
  BASE_URL,
  NGROK_URL,
  HEALTH_CHECK_URL,
  SERVER_CONFIG,
  NETWORK_CONFIG,
};
`;
    
    fs.writeFileSync(APP_CONFIG_PATH, configContent);
    console.log('   ✓ Updated config/api.js with ngrok URL');
}

// Save ngrok URL to file for reference
function saveNgrokUrl(ngrokUrl) {
    fs.writeFileSync(NGROK_URL_FILE, ngrokUrl);
    console.log('   ✓ Saved URL to .ngrok-url');
}

// Start the Express server
function startServer() {
    console.log('');
    console.log('🚀 Starting Express server...');
    console.log('─'.repeat(60));
    console.log('');
    
    const serverProcess = spawn('node', ['index.js'], {
        cwd: ROOT_DIR,
        stdio: 'inherit',
        shell: true
    });
    
    serverProcess.on('exit', (code) => {
        console.log(`Server exited with code ${code}`);
        ngrok.kill();
        process.exit(code);
    });
    
    // Handle Ctrl+C gracefully
    process.on('SIGINT', async () => {
        console.log('\n👋 Shutting down...');
        serverProcess.kill();
        await ngrok.kill();
        process.exit(0);
    });
}

// Main execution
async function main() {
    try {
        // Step 1: Start ngrok
        console.log(`🚀 Starting ngrok tunnel to port ${SERVER_PORT}...`);
        
        // Set auth token if available (you can also set NGROK_AUTHTOKEN env variable)
        const authToken = process.env.NGROK_AUTHTOKEN || '384Il6itOAJMZmew2IyMjRz43cq_77CeC9x1Exqc7SLg366DW';
        
        if (authToken) {
            await ngrok.authtoken(authToken);
        }
        
        const ngrokUrl = await ngrok.connect(SERVER_PORT);
        
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║                    NGROK TUNNEL READY                       ║');
        console.log('╠════════════════════════════════════════════════════════════╣');
        console.log(`║  🌐 Public URL: ${ngrokUrl.padEnd(41)}║`);
        console.log(`║  📱 API URL:    ${(ngrokUrl + '/api').padEnd(41)}║`);
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('');
        
        // Step 2: Update all config files
        updateAppEnv(ngrokUrl);
        updateAppConfig(ngrokUrl);
        saveNgrokUrl(ngrokUrl);
        
        console.log('');
        console.log('✅ All configurations updated!');
        console.log('');
        console.log('📱 NEXT STEPS:');
        console.log('   1. In a NEW terminal, run: cd App && npx expo start --clear');
        console.log('   2. Scan the QR code with Expo Go');
        console.log('   3. App will connect via ngrok from ANY network!');
        console.log('');
        
        // Step 3: Start Express server
        startServer();
        
    } catch (error) {
        console.error('');
        console.error('❌ Error:', error.message);
        console.error('');
        console.error('Troubleshooting:');
        console.error('1. Run: npm install ngrok --save (in Server folder)');
        console.error('2. Make sure port 5000 is not in use');
        console.error('3. Check your internet connection');
        process.exit(1);
    }
}

main();
