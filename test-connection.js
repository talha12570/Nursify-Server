require('dotenv').config();
const http = require('http');

const SERVER_IP = '192.168.0.119';
const SERVER_PORT = '5000';

console.log('\n🔍 Testing Server Connectivity');
console.log('==========================================');
console.log('Target:', `http://${SERVER_IP}:${SERVER_PORT}`);
console.log('Time:', new Date().toLocaleString());
console.log('==========================================\n');

const testEndpoint = (path, method = 'GET') => {
    return new Promise((resolve) => {
        const options = {
            hostname: SERVER_IP,
            port: SERVER_PORT,
            path: path,
            method: method,
            timeout: 5000
        };

        console.log(`Testing ${method} ${path}...`);

        const req = http.request(options, (res) => {
            console.log(`✅ ${path} - Status: ${res.statusCode}`);
            resolve(true);
        });

        req.on('error', (error) => {
            console.log(`❌ ${path} - Error: ${error.message}`);
            resolve(false);
        });

        req.on('timeout', () => {
            console.log(`❌ ${path} - Timeout (5 seconds)`);
            req.destroy();
            resolve(false);
        });

        req.end();
    });
};

const runTests = async () => {
    console.log('📡 Testing server endpoints...\n');

    const results = await Promise.all([
        testEndpoint('/'),
        testEndpoint('/auth/login'),
        testEndpoint('/otp/verify'),
    ]);

    console.log('\n==========================================');
    const allPassed = results.every(r => r);
    
    if (allPassed) {
        console.log('✅ SERVER IS REACHABLE!');
        console.log('The backend server is running and accessible.');
    } else {
        console.log('❌ SERVER IS NOT REACHABLE!');
        console.log('\nPossible issues:');
        console.log('1. Server is not running (run: cd Server && npm start)');
        console.log('2. IP address changed (current: ' + SERVER_IP + ')');
        console.log('3. Firewall blocking connections');
        console.log('4. Server crashed or port 5000 is in use');
        console.log('\nTo check if server is running:');
        console.log('- Look for "✅ Server is running on port 5000" in terminal');
        console.log('- Or open browser: http://localhost:5000');
    }
    console.log('==========================================\n');

    // Test localhost too
    console.log('\n🔍 Testing localhost connection...');
    const localhostOptions = {
        hostname: 'localhost',
        port: SERVER_PORT,
        path: '/',
        method: 'GET',
        timeout: 3000
    };

    const localhostReq = http.request(localhostOptions, (res) => {
        console.log(`✅ Localhost reachable - Server is definitely running!`);
        console.log('\nIssue: Mobile app cannot reach server via network IP');
        console.log('Solution: Check firewall or WiFi settings\n');
    });

    localhostReq.on('error', () => {
        console.log(`❌ Localhost NOT reachable - Server is NOT running!`);
        console.log('\nAction required: Start the server');
        console.log('Run: cd Server && npm start\n');
    });

    localhostReq.end();
};

runTests();
