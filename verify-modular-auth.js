/**
 * Simple Modular Auth Verification
 * Tests the new authentication router structure
 */

const https = require('https');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://clientportal.replit.app',
        ...options.headers
      }
    };

    const req = (urlObj.protocol === 'https:' ? https : require('http')).request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsedData });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function verifyModularAuth() {
  console.log('Testing modular authentication router...\n');

  try {
    // Test password reset request
    const result = await makeRequest('http://localhost:5000/api/auth/request-reset', {
      method: 'POST',
      body: { email: 'admin@boreal.com' }
    });

    console.log('Password reset endpoint test:');
    console.log(`Status: ${result.status}`);
    console.log(`Response:`, result.data);

    if (result.status === 200 && result.data.message === 'Reset email sent') {
      console.log('✅ Modular auth router working correctly');
    } else {
      console.log('❌ Modular auth router issue detected');
    }

  } catch (error) {
    console.error('Test error:', error.message);
  }
}

verifyModularAuth();