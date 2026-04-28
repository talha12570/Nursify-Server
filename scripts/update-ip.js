#!/usr/bin/env node
const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Detect the local IPv4 address on the active network
 */
function getLocalIp() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4;
            if (net.family === familyV4Value && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

/**
 * Update or insert SERVER_IP in .env file
 */
function updateEnvFile(ip) {
    const envPath = path.join(__dirname, '..', '.env');
    
    let envContent = '';
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    const serverIpLine = `SERVER_IP=${ip}`;
    const lines = envContent.split('\n');
    let updated = false;
    
    // Update existing SERVER_IP or add it
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('SERVER_IP=')) {
            lines[i] = serverIpLine;
            updated = true;
            break;
        }
    }
    
    if (!updated) {
        // Add SERVER_IP at the end
        if (envContent && !envContent.endsWith('\n')) {
            lines.push('');
        }
        lines.push(serverIpLine);
    }
    
    fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
    console.log(`✓ Updated .env: SERVER_IP=${ip}`);
}

/**
 * Update App config/api.js
 */
function updateAppConfig(ip) {
    const appConfigPath = path.join(__dirname, '..', '..', 'App', 'config', 'api.js');
    
    if (fs.existsSync(appConfigPath)) {
        let content = fs.readFileSync(appConfigPath, 'utf8');
        
        // Replace the SERVER_IP value
        const regex = /const SERVER_IP = ['"][\d.]+['"]/;
        if (regex.test(content)) {
            content = content.replace(regex, `const SERVER_IP = '${ip}'`);
            fs.writeFileSync(appConfigPath, content, 'utf8');
            console.log(`✓ Updated App/config/api.js: SERVER_IP=${ip}`);
        }
    }
}

/**
 * Update Admin Portal config/api.ts
 */
function updateAdminConfig(ip) {
    const adminConfigPath = path.join(__dirname, '..', '..', 'Admin Portal', 'src', 'config', 'api.ts');
    
    if (fs.existsSync(adminConfigPath)) {
        let content = fs.readFileSync(adminConfigPath, 'utf8');
        
        // Replace the SERVER_IP value
        const regex = /const SERVER_IP = ['"][\d.]+['"]/;
        if (regex.test(content)) {
            content = content.replace(regex, `const SERVER_IP = '${ip}'`);
            fs.writeFileSync(adminConfigPath, content, 'utf8');
            console.log(`✓ Updated Admin Portal/src/config/api.ts: SERVER_IP=${ip}`);
        }
    }
}

// Main execution
console.log('🔍 Detecting local network IP address...');
const detectedIp = getLocalIp();
console.log(`📡 Detected IP: ${detectedIp}`);

// Update all configs
updateEnvFile(detectedIp);
updateAppConfig(detectedIp);
updateAdminConfig(detectedIp);

console.log('✅ All configurations updated successfully!');
console.log(`\n🚀 Server will be available at: http://${detectedIp}:5000`);
