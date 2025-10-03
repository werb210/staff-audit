/**
 * Test SMS Authentication Endpoint
 * Tests the SMS endpoint with various scenarios to identify the 400 error
 */

const https = require('https');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ 
            status: res.statusCode, 
            data: parsed, 
            headers: res.headers,
            raw: data
          });
        } catch {
          resolve({ 
            status: res.statusCode, 
            data: data, 
            headers: res.headers,
            raw: data
          });
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

async function testSmsEndpoint() {
  console.log('Testing SMS Authentication Endpoint\n');
  
  const baseUrl = 'https://staffportal.replit.app';

  try {
    // Test 1: Basic request-reset test
    console.log('1. Testing /api/auth/request-reset with valid phone');
    const response1 = await makeRequest(`${baseUrl}/api/auth/request-reset`, {
      method: 'POST',
      headers: { 'Origin': 'https://clientportal.replit.app' },
      body: { phone: '+12345678901' }
    });
    
    console.log(`   Status: ${response1.status}`);
    console.log(`   Response: ${JSON.stringify(response1.data, null, 2)}`);
    console.log('');

    // Test 2: Check if it's a phone validation issue
    console.log('2. Testing with different phone format');
    const response2 = await makeRequest(`${baseUrl}/api/auth/request-reset`, {
      method: 'POST',
      headers: { 'Origin': 'https://clientportal.replit.app' },
      body: { phone: '1234567890' }
    });
    
    console.log(`   Status: ${response2.status}`);
    console.log(`   Response: ${JSON.stringify(response2.data, null, 2)}`);
    console.log('');

    // Test 3: Test without phone (should be 400)
    console.log('3. Testing without phone number (should be 400)');
    const response3 = await makeRequest(`${baseUrl}/api/auth/request-reset`, {
      method: 'POST',
      headers: { 'Origin': 'https://clientportal.replit.app' },
      body: {}
    });
    
    console.log(`   Status: ${response3.status}`);
    console.log(`   Response: ${JSON.stringify(response3.data, null, 2)}`);
    console.log('');

    // Test 4: Test if auth router is mounted at wrong path
    console.log('4. Testing if router is at /api/request-reset');
    const response4 = await makeRequest(`${baseUrl}/api/request-reset`, {
      method: 'POST',
      headers: { 'Origin': 'https://clientportal.replit.app' },
      body: { phone: '+12345678901' }
    });
    
    console.log(`   Status: ${response4.status}`);
    console.log(`   Response: ${JSON.stringify(response4.data, null, 2)}`);

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testSmsEndpoint();