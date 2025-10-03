/**
 * Debug SMS Authentication Endpoint
 * Investigates the 400 error in the request-reset endpoint
 */

import https from 'https';

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

async function debugSmsAuth() {
  console.log('Debug SMS Authentication Endpoint\n');
  
  const baseUrl = 'https://staffportal.replit.app';

  try {
    // Test 1: Check if endpoint exists
    console.log('1. Testing /api/auth/request-reset endpoint');
    const response = await makeRequest(`${baseUrl}/api/auth/request-reset`, {
      method: 'POST',
      headers: { 'Origin': 'https://clientportal.replit.app' },
      body: { phone: '+12345678901' }
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
    console.log(`   Raw: ${response.raw}\n`);

    // Test 2: Test with different phone format
    console.log('2. Testing with different phone format');
    const response2 = await makeRequest(`${baseUrl}/api/auth/request-reset`, {
      method: 'POST',
      headers: { 'Origin': 'https://clientportal.replit.app' },
      body: { phone: '1234567890' }
    });
    
    console.log(`   Status: ${response2.status}`);
    console.log(`   Response: ${JSON.stringify(response2.data, null, 2)}\n`);

    // Test 3: Test without phone number
    console.log('3. Testing without phone number');
    const response3 = await makeRequest(`${baseUrl}/api/auth/request-reset`, {
      method: 'POST',
      headers: { 'Origin': 'https://clientportal.replit.app' },
      body: {}
    });
    
    console.log(`   Status: ${response3.status}`);
    console.log(`   Response: ${JSON.stringify(response3.data, null, 2)}\n`);

    // Test 4: Check if auth router is mounted correctly
    console.log('4. Testing auth router mounting');
    const response4 = await makeRequest(`${baseUrl}/api/request-reset`, {
      method: 'POST',
      headers: { 'Origin': 'https://clientportal.replit.app' },
      body: { phone: '+12345678901' }
    });
    
    console.log(`   Status: ${response4.status}`);
    console.log(`   Response: ${JSON.stringify(response4.data, null, 2)}\n`);

  } catch (error) {
    console.error('Debug failed:', error.message);
  }
}

debugSmsAuth();