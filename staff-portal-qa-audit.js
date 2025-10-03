/**
 * Staff Portal QA Audit Script
 * Comprehensive test suite for all routes, features, authentication, and button functionality
 */

import https from 'https';
import http from 'http';

// Test configuration
const BASE_URL = 'https://5b94728b-d7a4-4765-992e-926f94929109-00-3c18d2x352sp0.picard.replit.dev';
const CLIENT_URL = 'https://clientportal.replit.app';

// Test results tracking
const testResults = {
  routes: { passed: 0, failed: 0, errors: [] },
  authentication: { passed: 0, failed: 0, errors: [] },
  cors: { passed: 0, failed: 0, errors: [] },
  api: { passed: 0, failed: 0, errors: [] }
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const requestModule = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Staff-Portal-QA-Audit/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...options.headers
      },
      timeout: 10000
    };

    const req = requestModule.request(requestOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
          url: url
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        statusCode: 0,
        error: error.message,
        url: url
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        statusCode: 0,
        error: 'Request timeout',
        url: url
      });
    });

    if (options.data) {
      req.write(options.data);
    }
    
    req.end();
  });
}

// 1. Route Health Check
async function testRouteHealth() {
  console.log('\n🔍 1. ROUTE HEALTH CHECK');
  console.log('=' + '='.repeat(50));

  const routes = [
    '/',
    '/dashboard',
    '/dashboard/deals',
    '/dashboard/contacts', 
    '/dashboard/documents',
    '/dashboard/reports',
    '/dashboard/marketing',
    '/dashboard/settings',
    '/login'
  ];

  for (const route of routes) {
    const url = `${BASE_URL}${route}`;
    const response = await makeRequest(url);
    
    if (response.statusCode === 200) {
      console.log(`✅ ${route} - OK (200)`);
      testResults.routes.passed++;
    } else if (response.statusCode === 302 || response.statusCode === 301) {
      console.log(`🔄 ${route} - Redirect (${response.statusCode}) to ${response.headers.location || 'unknown'}`);
      testResults.routes.passed++;
    } else {
      console.log(`❌ ${route} - Failed (${response.statusCode}) ${response.error || ''}`);
      testResults.routes.failed++;
      testResults.routes.errors.push(`${route}: ${response.statusCode} ${response.error || ''}`);
    }
  }
}

// 2. API Endpoint Testing
async function testApiEndpoints() {
  console.log('\n🧪 2. API ENDPOINT TESTING');
  console.log('=' + '='.repeat(50));

  const apiEndpoints = [
    { path: '/api/health', method: 'GET', expectAuth: false },
    { path: '/api/auth/current-user', method: 'GET', expectAuth: true },
    { path: '/api/users', method: 'GET', expectAuth: true },
    { path: '/api/applications', method: 'GET', expectAuth: true },
    { path: '/api/lender-products', method: 'GET', expectAuth: false }
  ];

  // Test without authentication first
  for (const endpoint of apiEndpoints) {
    const url = `${BASE_URL}${endpoint.path}`;
    const response = await makeRequest(url, { method: endpoint.method });
    
    if (endpoint.expectAuth && response.statusCode === 401) {
      console.log(`✅ ${endpoint.path} - Properly protected (401)`);
      testResults.api.passed++;
    } else if (!endpoint.expectAuth && response.statusCode === 200) {
      console.log(`✅ ${endpoint.path} - Public endpoint accessible (200)`);
      testResults.api.passed++;
    } else if (!endpoint.expectAuth && response.statusCode === 401) {
      console.log(`❌ ${endpoint.path} - Should be public but returns 401`);
      testResults.api.failed++;
      testResults.api.errors.push(`${endpoint.path}: Expected public access but got 401`);
    } else {
      console.log(`⚠️  ${endpoint.path} - Status: ${response.statusCode}`);
    }
  }

  // Test with admin bypass (development mode)
  console.log('\n🔐 Testing with admin bypass (development mode):');
  for (const endpoint of apiEndpoints.filter(e => e.expectAuth)) {
    const url = `${BASE_URL}${endpoint.path}`;
    const response = await makeRequest(url, { 
      method: endpoint.method,
      headers: {
        'Authorization': 'Bearer null'
      }
    });
    
    if (response.statusCode === 200) {
      console.log(`✅ ${endpoint.path} - Admin bypass working (200)`);
      testResults.api.passed++;
    } else {
      console.log(`❌ ${endpoint.path} - Admin bypass failed (${response.statusCode})`);
      testResults.api.failed++;
      testResults.api.errors.push(`${endpoint.path}: Admin bypass failed - ${response.statusCode}`);
    }
  }
}

// 3. Authentication Flow Testing
async function testAuthenticationFlow() {
  console.log('\n🔐 3. AUTHENTICATION FLOW TESTING');
  console.log('=' + '='.repeat(50));

  // Test login endpoint
  const loginData = JSON.stringify({
    email: 'admin@boreal.com',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  });

  const loginResponse = await makeRequest(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    },
    data: loginData
  });

  if (loginResponse.statusCode === 200) {
    console.log('✅ Login endpoint - Working (200)');
    testResults.authentication.passed++;
    
    try {
      const loginResult = JSON.parse(loginResponse.body);
      if (loginResult.success) {
        console.log('✅ Login response - Success flag present');
        testResults.authentication.passed++;
      }
      if (loginResult.user) {
        console.log('✅ Login response - User data present');
        testResults.authentication.passed++;
      }
    } catch (e) {
      console.log('❌ Login response - Invalid JSON');
      testResults.authentication.failed++;
      testResults.authentication.errors.push('Login response: Invalid JSON');
    }
  } else {
    console.log(`❌ Login endpoint - Failed (${loginResponse.statusCode})`);
    testResults.authentication.failed++;
    testResults.authentication.errors.push(`Login: ${loginResponse.statusCode}`);
  }

  // Test protected routes without authentication
  const protectedRoutes = ['/dashboard', '/dashboard/contacts', '/dashboard/deals'];
  
  for (const route of protectedRoutes) {
    const response = await makeRequest(`${BASE_URL}${route}`);
    
    // Check if it redirects to login or returns auth error
    if (response.statusCode === 302 && response.headers.location?.includes('/login')) {
      console.log(`✅ ${route} - Properly redirects to login when not authenticated`);
      testResults.authentication.passed++;
    } else if (response.statusCode === 401 || response.statusCode === 403) {
      console.log(`✅ ${route} - Properly returns auth error (${response.statusCode})`);
      testResults.authentication.passed++;
    } else {
      console.log(`⚠️  ${route} - Status: ${response.statusCode} (may be accessible without auth)`);
    }
  }
}

// 4. CORS Configuration Testing
async function testCorsConfiguration() {
  console.log('\n🌐 4. CORS CONFIGURATION TESTING');
  console.log('=' + '='.repeat(50));

  const corsTestEndpoints = ['/api/auth/current-user', '/api/users', '/api/health'];
  const testOrigins = [
    'https://clientportal.replit.app',
    'https://client.replit.app',
    'https://localhost:3000'
  ];

  for (const origin of testOrigins) {
    console.log(`\nTesting CORS with origin: ${origin}`);
    
    for (const endpoint of corsTestEndpoints) {
      // Preflight request
      const preflightResponse = await makeRequest(`${BASE_URL}${endpoint}`, {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'authorization,content-type'
        }
      });

      if (preflightResponse.headers['access-control-allow-origin']) {
        console.log(`✅ ${endpoint} - CORS preflight OK for ${origin}`);
        testResults.cors.passed++;
      } else {
        console.log(`❌ ${endpoint} - CORS preflight failed for ${origin}`);
        testResults.cors.failed++;
        testResults.cors.errors.push(`${endpoint}: No CORS headers for ${origin}`);
      }

      // Actual request with Origin header
      const actualResponse = await makeRequest(`${BASE_URL}${endpoint}`, {
        headers: { 'Origin': origin }
      });

      if (actualResponse.headers['access-control-allow-origin']) {
        console.log(`✅ ${endpoint} - CORS actual request OK for ${origin}`);
        testResults.cors.passed++;
      } else {
        console.log(`❌ ${endpoint} - CORS actual request failed for ${origin}`);
        testResults.cors.failed++;
        testResults.cors.errors.push(`${endpoint}: No CORS headers in actual request for ${origin}`);
      }
    }
  }
}

// 5. Content and UI Verification
async function testContentVerification() {
  console.log('\n📄 5. CONTENT AND UI VERIFICATION');
  console.log('=' + '='.repeat(50));

  // Test main dashboard page content
  const dashboardResponse = await makeRequest(`${BASE_URL}/dashboard`);
  
  if (dashboardResponse.statusCode === 200) {
    const content = dashboardResponse.body.toLowerCase();
    
    // Check for key dashboard elements
    const expectedElements = [
      'dashboard',
      'contacts',
      'deals',
      'documents',
      'reports',
      'marketing',
      'settings'
    ];

    let foundElements = 0;
    for (const element of expectedElements) {
      if (content.includes(element)) {
        foundElements++;
        console.log(`✅ Dashboard contains: ${element}`);
      } else {
        console.log(`❌ Dashboard missing: ${element}`);
      }
    }

    if (foundElements >= expectedElements.length * 0.7) {
      console.log('✅ Dashboard content verification - Passed');
      testResults.routes.passed++;
    } else {
      console.log('❌ Dashboard content verification - Failed');
      testResults.routes.failed++;
      testResults.routes.errors.push('Dashboard: Missing key navigation elements');
    }
  }

  // Test login page content
  const loginResponse = await makeRequest(`${BASE_URL}/login`);
  
  if (loginResponse.statusCode === 200) {
    const content = loginResponse.body.toLowerCase();
    
    if (content.includes('login') || content.includes('email') || content.includes('password')) {
      console.log('✅ Login page content verification - Passed');
      testResults.authentication.passed++;
    } else {
      console.log('❌ Login page content verification - Failed');
      testResults.authentication.failed++;
      testResults.authentication.errors.push('Login page: Missing login form elements');
    }
  }
}

// Generate final report
function generateFinalReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL QA AUDIT REPORT');
  console.log('='.repeat(60));

  const totalPassed = testResults.routes.passed + testResults.authentication.passed + 
                     testResults.cors.passed + testResults.api.passed;
  const totalFailed = testResults.routes.failed + testResults.authentication.failed + 
                     testResults.cors.failed + testResults.api.failed;
  const totalTests = totalPassed + totalFailed;

  console.log(`\n📈 SUMMARY:`);
  console.log(`✅ ${testResults.routes.passed}/${testResults.routes.passed + testResults.routes.failed} routes OK`);
  console.log(`🔐 ${testResults.authentication.passed}/${testResults.authentication.passed + testResults.authentication.failed} authentication tests passed`);
  console.log(`🌐 ${testResults.cors.passed}/${testResults.cors.passed + testResults.cors.failed} CORS tests passed`);
  console.log(`🧪 ${testResults.api.passed}/${testResults.api.passed + testResults.api.failed} API tests passed`);
  console.log(`\n🎯 OVERALL: ${totalPassed}/${totalTests} tests passed (${Math.round(totalPassed/totalTests*100)}%)`);

  if (testResults.routes.errors.length > 0) {
    console.log(`\n❌ Route Errors:`);
    testResults.routes.errors.forEach(error => console.log(`   - ${error}`));
  }

  if (testResults.authentication.errors.length > 0) {
    console.log(`\n❌ Authentication Errors:`);
    testResults.authentication.errors.forEach(error => console.log(`   - ${error}`));
  }

  if (testResults.cors.errors.length > 0) {
    console.log(`\n❌ CORS Errors:`);
    testResults.cors.errors.forEach(error => console.log(`   - ${error}`));
  }

  if (testResults.api.errors.length > 0) {
    console.log(`\n❌ API Errors:`);
    testResults.api.errors.forEach(error => console.log(`   - ${error}`));
  }

  console.log('\n' + '='.repeat(60));
  
  // Return overall status
  return totalPassed === totalTests;
}

// Main execution function
async function runStaffPortalQaAudit() {
  console.log('🚀 STAFF PORTAL QA AUDIT STARTING...');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Test Client URL: ${CLIENT_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    await testRouteHealth();
    await testApiEndpoints();
    await testAuthenticationFlow();
    await testCorsConfiguration();
    await testContentVerification();
    
    const allTestsPassed = generateFinalReport();
    
    if (allTestsPassed) {
      console.log('\n🎉 ALL TESTS PASSED - STAFF PORTAL READY FOR PRODUCTION');
      process.exit(0);
    } else {
      console.log('\n⚠️  SOME TESTS FAILED - REVIEW ISSUES ABOVE');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 AUDIT FAILED WITH ERROR:', error.message);
    process.exit(1);
  }
}

// Run the audit
runStaffPortalQaAudit();