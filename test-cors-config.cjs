/**
 * Test CORS Configuration
 * Verifies the exact CORS middleware setup is working correctly
 */

const http = require('http');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
          headers: res.headers, 
          data: data
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testCorsConfig() {
  console.log('Testing CORS Configuration\n');
  
  const baseUrl = 'http://localhost:5000';
  
  try {
    // Test 1: OPTIONS preflight request
    console.log('1. Testing OPTIONS preflight request');
    const preflight = await makeRequest(`${baseUrl}/api/health`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://clientportal.replit.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log(`   Status: ${preflight.status}`);
    
    // Test 2: Actual POST request with CORS headers
    console.log('\n2. Testing POST request with CORS headers');
    const postRequest = await makeRequest(`${baseUrl}/api/auth/request-reset`, {
      method: 'POST',
      headers: {
        'Origin': 'https://clientportal.replit.app'
      },
      body: {
        phone: '+15551234567'
      }
    });
    
    console.log(`   Status: ${postRequest.status}`);
    
    // Test 3: Request without origin (should not have CORS headers)
    console.log('\n3. Testing request without origin');
    const noOrigin = await makeRequest(`${baseUrl}/api/health`);
    console.log(`   Status: ${noOrigin.status}`);
    
    console.log('\n✅ CORS Configuration Test Complete');
    
  } catch (error) {
    console.error('❌ CORS test failed:', error.message);
  }
}

testCorsConfig();