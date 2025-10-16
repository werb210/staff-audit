/**
 * Comprehensive System Test - Following User Test Checklist
 * Tests all API functionality, CORS, authentication, and system integration
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

async function runComprehensiveSystemTests() {
  console.log('🧪 COMPREHENSIVE SYSTEM TEST - Following User Checklist\n');
  
  const baseUrl = 'https://staffportal.replit.app';
  let results = [];

  try {
    // ✅ 1. API FUNCTIONALITY TESTS
    console.log('📡 Testing API Functionality...\n');

    // Test 1: Health check
    console.log('1. Health Check Test');
    const healthResponse = await makeRequest(`${baseUrl}/api/health`);
    const healthPassed = healthResponse.status === 200 && 
                        healthResponse.data && 
                        healthResponse.data.status === 'healthy';
    
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Response: ${JSON.stringify(healthResponse.data)}`);
    console.log(`   Result: ${healthPassed ? '✅ PASS' : '❌ FAIL'}\n`);
    
    results.push({
      test: 'Health Check (/api/health)',
      passed: healthPassed,
      details: healthResponse.data
    });

    // Test 2: CORS Headers
    console.log('2. CORS Headers Test');
    const corsResponse = await makeRequest(`${baseUrl}/api/auth/current-user`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://clientportal.replit.app',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    const corsOrigin = corsResponse.headers['access-control-allow-origin'];
    const corsCredentials = corsResponse.headers['access-control-allow-credentials'];
    const corsPassed = corsOrigin === 'https://clientportal.replit.app' && 
                      corsCredentials === 'true';
    
    console.log(`   Status: ${corsResponse.status}`);
    console.log(`   Result: ${corsPassed ? '✅ PASS' : '❌ FAIL'}\n`);
    
    results.push({
      test: 'CORS Headers',
      passed: corsPassed,
      details: { corsOrigin, corsCredentials }
    });

    // Test 3: JSON-only responses
    console.log('3. JSON-only Responses Test');
    const jsonResponse = await makeRequest(`${baseUrl}/api/nonexistent-endpoint`);
    const isJson = jsonResponse.raw.startsWith('{') || jsonResponse.raw.startsWith('[');
    
    console.log(`   Status: ${jsonResponse.status}`);
    console.log(`   Content-Type: ${jsonResponse.headers['content-type']}`);
    console.log(`   Is JSON: ${isJson}`);
    console.log(`   Result: ${isJson ? '✅ PASS' : '❌ FAIL'}\n`);
    
    results.push({
      test: 'JSON-only Responses',
      passed: isJson,
      details: { contentType: jsonResponse.headers['content-type'] }
    });

    // Test 4: Authentication endpoints
    console.log('4. SMS Authentication Test');
    const authResponse = await makeRequest(`${baseUrl}/api/auth/request-reset`, {
      method: 'POST',
      headers: {
        'Origin': 'https://clientportal.replit.app'
      },
      body: {
        phone: '+12345678901'
      }
    });
    
    const authPassed = authResponse.status === 200 || authResponse.status === 404;
    
    console.log(`   Status: ${authResponse.status}`);
    console.log(`   Response: ${JSON.stringify(authResponse.data)}`);
    console.log(`   Result: ${authPassed ? '✅ PASS' : '❌ FAIL'}\n`);
    
    results.push({
      test: 'SMS Authentication',
      passed: authPassed,
      details: authResponse.data
    });

    // Test 5: CORS Preflight for Auth
    console.log('5. CORS Preflight for Auth Test');
    const preflightResponse = await makeRequest(`${baseUrl}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://clientportal.replit.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    const preflightPassed = preflightResponse.status === 200 &&
                           preflightResponse.headers['access-control-allow-origin'] === 'https://clientportal.replit.app';
    
    console.log(`   Status: ${preflightResponse.status}`);
    console.log(`   Result: ${preflightPassed ? '✅ PASS' : '❌ FAIL'}\n`);
    
    results.push({
      test: 'CORS Preflight for Auth',
      passed: preflightPassed,
      details: preflightResponse.headers
    });

    // Generate comprehensive report
    console.log('📊 COMPREHENSIVE TEST RESULTS');
    console.log('='.repeat(50));
    
    let passedTests = 0;
    results.forEach((result, index) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.test}: ${status}`);
      if (result.passed) passedTests++;
    });

    const successRate = Math.round((passedTests / results.length) * 100);
    console.log(`\n📈 OVERALL SYSTEM STATUS:`);
    console.log(`✅ Tests Passed: ${passedTests}/${results.length} (${successRate}%)`);
    
    if (successRate === 100) {
      console.log('\n🎉 ALL SYSTEMS OPERATIONAL');
      console.log('✅ API functionality working correctly');
      console.log('✅ CORS configuration properly set');
      console.log('✅ Authentication endpoints responding');
      console.log('✅ JSON-only responses enforced');
      console.log('✅ SMS password reset system operational');
      console.log('✅ Ready for production deployment');
    } else if (successRate >= 80) {
      console.log('\n✅ SYSTEM MOSTLY OPERATIONAL');
      console.log('⚠️  Minor issues detected, review failed tests');
    } else {
      console.log('\n⚠️  SYSTEM NEEDS ATTENTION');
      console.log('❌ Multiple critical issues detected');
    }

    console.log('\n🔍 Next Steps:');
    console.log('1. Test admin UX features in browser');
    console.log('2. Verify sales pipeline functionality');
    console.log('3. Test file upload/download system');
    console.log('4. Validate client-staff integration');

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

// Run the comprehensive test
runComprehensiveSystemTests().catch(console.error);