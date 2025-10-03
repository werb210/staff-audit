/**
 * System Verification Script - Tests Core Functionality
 * Verifies API health, CORS, authentication, and JSON responses
 */

const https = require('https');
const http = require('http');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const defaultPort = isHttps ? 443 : 80;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || defaultPort,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    };

    const client = isHttps ? https : http;
    const req = client.request(reqOptions, (res) => {
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

async function runSystemVerification() {
  console.log('System Verification - Testing Core Functionality\n');
  
  const baseUrl = 'http://localhost:5000';
  let results = [];

  try {
    // Test 1: Health Check
    console.log('1. Health Check Test');
    const healthResponse = await makeRequest(`${baseUrl}/api/health`);
    const healthPassed = healthResponse.status === 200;
    
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Response: ${JSON.stringify(healthResponse.data)}`);
    console.log(`   Result: ${healthPassed ? 'PASS' : 'FAIL'}\n`);
    
    results.push({ test: 'Health Check', passed: healthPassed });

    // Test 2: CORS Preflight
    console.log('2. CORS Preflight Test');
    const corsResponse = await makeRequest(`${baseUrl}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://clientportal.replit.app',
        'Access-Control-Request-Method': 'POST'
      }
    });
    
    const corsOrigin = corsResponse.headers['access-control-allow-origin'];
    const corsPassed = corsOrigin === 'https://clientportal.replit.app';
    
    console.log(`   Status: ${corsResponse.status}`);
    console.log(`   CORS Origin: ${corsOrigin}`);
    console.log(`   Result: ${corsPassed ? 'PASS' : 'FAIL'}\n`);
    
    results.push({ test: 'CORS Configuration', passed: corsPassed });

    // Test 3: JSON Response Format
    console.log('3. JSON Response Test');
    const jsonResponse = await makeRequest(`${baseUrl}/api/invalid-endpoint`);
    const isJson = jsonResponse.raw.startsWith('{');
    
    console.log(`   Status: ${jsonResponse.status}`);
    console.log(`   Is JSON: ${isJson}`);
    console.log(`   Result: ${isJson ? 'PASS' : 'FAIL'}\n`);
    
    results.push({ test: 'JSON-only Responses', passed: isJson });

    // Test 4: SMS Auth Endpoint
    console.log('4. SMS Authentication Test');
    const authResponse = await makeRequest(`${baseUrl}/api/auth/request-reset`, {
      method: 'POST',
      headers: { 'Origin': 'https://clientportal.replit.app' },
      body: { phone: '+15551234567' }
    });
    
    const authPassed = authResponse.status === 200;
    
    console.log(`   Status: ${authResponse.status}`);
    console.log(`   Response: ${JSON.stringify(authResponse.data)}`);
    console.log(`   Result: ${authPassed ? 'PASS' : 'FAIL'}\n`);
    
    results.push({ test: 'SMS Authentication', passed: authPassed });

    // Summary
    console.log('VERIFICATION RESULTS');
    console.log('='.repeat(40));
    
    let passedTests = 0;
    results.forEach((result, index) => {
      const status = result.passed ? 'PASS' : 'FAIL';
      console.log(`${index + 1}. ${result.test}: ${status}`);
      if (result.passed) passedTests++;
    });

    const successRate = Math.round((passedTests / results.length) * 100);
    console.log(`\nSuccess Rate: ${passedTests}/${results.length} (${successRate}%)`);
    
    if (successRate === 100) {
      console.log('\nSYSTEM STATUS: FULLY OPERATIONAL');
      console.log('- API endpoints responding correctly');
      console.log('- CORS properly configured');
      console.log('- JSON-only responses enforced');
      console.log('- SMS authentication working');
    } else {
      console.log('\nSYSTEM STATUS: PARTIALLY OPERATIONAL');
    }

  } catch (error) {
    console.error('Verification failed:', error.message);
  }
}

runSystemVerification();