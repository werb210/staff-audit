/**
 * Production CORS Deployment Verification
 * Tests the deployed staff application at https://staffportal.replit.app
 */

import https from 'https';

function makeHttpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const { method = 'GET', headers = {}, body } = options;
    
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ProductionVerification/1.0',
        ...headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ 
            status: res.statusCode, 
            data: parsed, 
            headers: res.headers,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        } catch {
          resolve({ 
            status: res.statusCode, 
            data, 
            headers: res.headers,
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(15000, () => {
      req.abort();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function verifyProductionCorsDeployment() {
  console.log('🌐 Production CORS Deployment Verification');
  console.log('==========================================');
  console.log('Target: https://staffportal.replit.app');

  const PRODUCTION_URL = 'https://staffportal.replit.app';
  let testResults = {
    passed: 0,
    failed: 0,
    details: []
  };

  // Test 1: Health Endpoint Verification
  console.log('\n1️⃣ Testing Production Health Endpoint');
  try {
    const response = await makeHttpsRequest(`${PRODUCTION_URL}/api/health`);

    if (response.success && response.data.status === 'healthy') {
      console.log('✅ Production health endpoint operational');
      console.log(`   Status: ${response.data.status}`);
      console.log(`   Database: ${response.data.database}`);
      console.log(`   Timestamp: ${response.data.timestamp}`);
      testResults.passed++;
      testResults.details.push({
        test: 'Production Health',
        status: 'PASS'
      });
    } else {
      console.log('❌ Production health endpoint failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      testResults.failed++;
      testResults.details.push({
        test: 'Production Health',
        status: 'FAIL',
        error: response.data
      });
    }
  } catch (error) {
    console.log(`❌ Production health test failed: ${error.message}`);
    testResults.failed++;
    testResults.details.push({
      test: 'Production Health',
      status: 'ERROR',
      error: error.message
    });
  }

  // Test 2: CORS Pre-flight for Client Portal
  console.log('\n2️⃣ Testing Production CORS - Client Portal Origin');
  try {
    const response = await makeHttpsRequest(`${PRODUCTION_URL}/api/auth/register`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://clientportal.replit.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });

    const allowOrigin = response.headers['access-control-allow-origin'];
    const allowCredentials = response.headers['access-control-allow-credentials'];
    const allowMethods = response.headers['access-control-allow-methods'];

    if (response.success && allowOrigin === 'https://clientportal.replit.app' && allowCredentials === 'true') {
      console.log('✅ Production CORS configured correctly for client portal');
      console.log(`   Allow Origin: ${allowOrigin}`);
      console.log(`   Allow Credentials: ${allowCredentials}`);
      console.log(`   Allow Methods: ${allowMethods}`);
      testResults.passed++;
      testResults.details.push({
        test: 'Production CORS Client',
        status: 'PASS'
      });
    } else {
      console.log('❌ Production CORS configuration failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Allow Origin: ${allowOrigin || 'missing'}`);
      console.log(`   Allow Credentials: ${allowCredentials || 'missing'}`);
      testResults.failed++;
      testResults.details.push({
        test: 'Production CORS Client',
        status: 'FAIL',
        error: 'Incorrect CORS headers'
      });
    }
  } catch (error) {
    console.log(`❌ Production CORS test failed: ${error.message}`);
    testResults.failed++;
    testResults.details.push({
      test: 'Production CORS Client',
      status: 'ERROR',
      error: error.message
    });
  }

  // Test 3: CORS Pre-flight for Preview Domain
  console.log('\n3️⃣ Testing Production CORS - Preview Domain Pattern');
  try {
    const previewOrigin = 'https://abc123-preview.replit.app';
    const response = await makeHttpsRequest(`${PRODUCTION_URL}/api/auth/register`, {
      method: 'OPTIONS',
      headers: {
        'Origin': previewOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });

    const allowOrigin = response.headers['access-control-allow-origin'];
    const allowCredentials = response.headers['access-control-allow-credentials'];

    if (response.success && allowOrigin === previewOrigin && allowCredentials === 'true') {
      console.log('✅ Production CORS supports preview domains');
      console.log(`   Allow Origin: ${allowOrigin}`);
      console.log(`   Allow Credentials: ${allowCredentials}`);
      testResults.passed++;
      testResults.details.push({
        test: 'Production CORS Preview',
        status: 'PASS'
      });
    } else {
      console.log('❌ Production CORS preview domain support failed');
      console.log(`   Status: ${response.status}`);
      console.log(`   Allow Origin: ${allowOrigin || 'missing'}`);
      console.log(`   Allow Credentials: ${allowCredentials || 'missing'}`);
      testResults.failed++;
      testResults.details.push({
        test: 'Production CORS Preview',
        status: 'FAIL',
        error: 'Preview domain not supported'
      });
    }
  } catch (error) {
    console.log(`❌ Production CORS preview test failed: ${error.message}`);
    testResults.failed++;
    testResults.details.push({
      test: 'Production CORS Preview',
      status: 'ERROR',
      error: error.message
    });
  }

  // Test 4: Authentication Endpoint Availability
  console.log('\n4️⃣ Testing Production Authentication Endpoints');
  try {
    const endpoints = [
      '/api/auth/register',
      '/api/auth/login',
      '/api/auth/verify-otp',
      '/api/auth/resend-otp'
    ];

    let workingEndpoints = 0;
    for (const endpoint of endpoints) {
      try {
        const response = await makeHttpsRequest(`${PRODUCTION_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Origin': 'https://clientportal.replit.app'
          },
          body: { test: 'connectivity' }
        });
        
        // Accept 400 (bad request) but not 500 (server error) or 404 (not found)
        if (response.status >= 200 && response.status < 500 && response.status !== 404) {
          workingEndpoints++;
        }
      } catch (err) {
        // Endpoint not responding
      }
    }

    if (workingEndpoints === endpoints.length) {
      console.log('✅ All authentication endpoints responding');
      console.log(`   Endpoints: ${endpoints.join(', ')}`);
      testResults.passed++;
      testResults.details.push({
        test: 'Production Auth Endpoints',
        status: 'PASS'
      });
    } else {
      console.log('❌ Some authentication endpoints not responding');
      console.log(`   Working: ${workingEndpoints}/${endpoints.length}`);
      testResults.failed++;
      testResults.details.push({
        test: 'Production Auth Endpoints',
        status: 'FAIL',
        error: `Only ${workingEndpoints}/${endpoints.length} endpoints working`
      });
    }
  } catch (error) {
    console.log(`❌ Authentication endpoints test failed: ${error.message}`);
    testResults.failed++;
    testResults.details.push({
      test: 'Production Auth Endpoints',
      status: 'ERROR',
      error: error.message
    });
  }

  // Summary
  console.log('\n📊 Production Deployment Verification Results');
  console.log('=============================================');
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 Production deployment successful!');
    console.log('');
    console.log('Verified Features:');
    console.log('• Health endpoint responding with JSON');
    console.log('• CORS configured for https://clientportal.replit.app');
    console.log('• CORS supporting Replit preview domains (*.replit.app)');
    console.log('• Authentication endpoints operational');
    console.log('• Cross-origin authentication ready');
    console.log('');
    console.log('The staff application is ready for cross-origin requests');
    console.log('from the client portal and any Replit preview environments.');
  } else {
    console.log('\n⚠️ Production deployment issues detected');
    console.log('\nFailed Tests:');
    testResults.details.filter(t => t.status !== 'PASS').forEach(test => {
      console.log(`• ${test.test}: ${test.status} - ${test.error || 'See details above'}`);
    });
    console.log('\nRecommendation: Check deployment logs and redeploy if necessary');
  }

  return testResults.failed === 0;
}

// Run verification
console.log('Starting production CORS deployment verification...');
console.log('This will test the live deployment at https://staffportal.replit.app');
console.log('');

verifyProductionCorsDeployment().then((success) => {
  console.log('');
  console.log(success ? 'Production verification completed successfully' : 'Production verification completed with issues');
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('Production verification failed:', error);
  process.exit(1);
});