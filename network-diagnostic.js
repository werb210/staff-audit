/**
 * Network Diagnostic Script
 * Verifies all specified requirements for production deployment
 */

const BASE_URL = 'http://localhost:5000';

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include',
    ...options
  });
  
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text };
  }
  
  return { 
    status: response.status, 
    data, 
    headers: response.headers,
    contentType: response.headers.get('content-type')
  };
}

async function runNetworkDiagnostic() {
  console.log('🔍 Network Diagnostic Report');
  console.log('============================');
  
  let allPassed = true;

  // Test 1: Health Check - Must return JSON
  console.log('\n1️⃣ Testing Health Endpoint');
  try {
    const healthResult = await makeRequest(`${BASE_URL}/health`);
    
    console.log(`Status: ${healthResult.status}`);
    console.log(`Content-Type: ${healthResult.contentType}`);
    console.log(`Response:`, healthResult.data);
    
    if (healthResult.status === 200 && 
        healthResult.contentType && 
        healthResult.contentType.includes('application/json') &&
        typeof healthResult.data === 'object' &&
        !healthResult.data.error) {
      console.log('✅ Health: Success (JSON)');
    } else {
      console.log('❌ Health: Failed - Expected JSON response');
      allPassed = false;
    }
  } catch (error) {
    console.log('❌ Health: Failed -', error.message);
    allPassed = false;
  }

  // Test 2: CORS Preflight - Must return 200 with correct headers
  console.log('\n2️⃣ Testing CORS Preflight');
  try {
    const corsResult = await makeRequest(`${BASE_URL}/api/auth/user`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://clientportal.replit.app',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });

    console.log(`Status: ${corsResult.status}`);
    console.log('CORS Headers:', {
      'access-control-allow-origin': corsResult.headers.get('access-control-allow-origin'),
      'access-control-allow-credentials': corsResult.headers.get('access-control-allow-credentials'),
      'access-control-allow-methods': corsResult.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': corsResult.headers.get('access-control-allow-headers')
    });
    
    if (corsResult.status === 200 && 
        corsResult.headers.get('access-control-allow-origin') === 'https://clientportal.replit.app' &&
        corsResult.headers.get('access-control-allow-credentials') === 'true') {
      console.log('✅ CORS preflight: Success (200, correct headers)');
    } else {
      console.log('❌ CORS preflight: Failed - Missing required headers');
      allPassed = false;
    }
  } catch (error) {
    console.log('❌ CORS preflight: Failed -', error.message);
    allPassed = false;
  }

  // Test 3: OTP Request - Must succeed
  console.log('\n3️⃣ Testing OTP Request');
  const timestamp = Date.now();
  const testUser = {
    email: `diagnostic${timestamp}@example.com`,
    password: 'SecurePass123!',
    phone: '+15878881837',
    firstName: 'Diagnostic',
    lastName: 'Test'
  };

  try {
    const otpResult = await makeRequest(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://clientportal.replit.app'
      },
      body: JSON.stringify(testUser)
    });

    console.log(`Status: ${otpResult.status}`);
    console.log(`Content-Type: ${otpResult.contentType}`);
    console.log(`Response:`, otpResult.data);
    
    if (otpResult.status === 200 && 
        otpResult.contentType && 
        otpResult.contentType.includes('application/json') &&
        otpResult.data.otpRequired) {
      console.log('✅ OTP Request: Succeeds');
      console.log('✅ Content-Type: application/json');
    } else {
      console.log('❌ OTP Request: Failed - Expected successful OTP registration');
      allPassed = false;
    }
  } catch (error) {
    console.log('❌ OTP Request: Failed -', error.message);
    allPassed = false;
  }

  // Final Assessment
  console.log('\n📊 Diagnostic Summary');
  console.log('=====================');
  
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED - Production Ready');
    console.log('✅ Health: Success (JSON)');
    console.log('✅ CORS preflight: Success (200, correct headers)');
    console.log('✅ OTP Request: Succeeds');
    console.log('✅ Content-Type: application/json');
  } else {
    console.log('⚠️ Some tests failed - Review issues above');
  }

  console.log('\n🚀 Staff Portal Network Diagnostic Complete');
  return allPassed;
}

// Run the diagnostic
runNetworkDiagnostic();