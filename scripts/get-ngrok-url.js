const http = require('http');

// Get ngrok URL from the ngrok API
const getNgrokUrl = () => {
    return new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const tunnel = parsed.tunnels.find(t => t.proto === 'https');
                    if (tunnel) {
                        resolve(tunnel.public_url);
                    } else {
                        reject(new Error('No HTTPS tunnel found'));
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
};

getNgrokUrl()
    .then(url => {
        console.log('\n✅ ngrok is running!');
        console.log('🌐 Public URL:', url);
        console.log('\n📱 Update your app config with this URL:');
        console.log(`   export const API_URL = "${url}/api";`);
        console.log('\n⚠️  Remember: This URL changes every time you restart ngrok!');
    })
    .catch(error => {
        console.error('❌ Error getting ngrok URL:', error.message);
        console.log('\n💡 Make sure ngrok is running with: ngrok http 5000');
    });
