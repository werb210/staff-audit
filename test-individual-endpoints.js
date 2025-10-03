/**
 * Individual Endpoint Validation
 * Tests each critical endpoint individually to identify exact failure points
 */

const TOKEN = process.env.CLIENT_APP_SHARED_TOKEN || 'test-token-placeholder';
const BASE_URL = 'http://localhost:5000/api';

async function makeRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    
    const data = response.headers.get('content-type')?.includes('json') 
      ? await response.json() 
      : await response.text();
      
    return { status: response.status, ok: response.ok, data };
  } catch (error) {
    return { status: 0, ok: false, error: error.message };
  }
}

async function testEndpoint(name, endpoint, method = 'GET', authRequired = true, body = null) {
  console.log(`\n🔍 Testing: ${name}`);
  console.log(`   Endpoint: ${method} ${endpoint}`);
  console.log(`   Auth Required: ${authRequired}`);
  
  // Test without authentication
  const unauthResponse = await makeRequest(endpoint, {
    method,
    body: body ? JSON.stringify(body) : undefined
  });
  
  console.log(`   📤 Without auth: ${unauthResponse.status} ${unauthResponse.ok ? 'OK' : 'FAIL'}`);
  if (authRequired && unauthResponse.status !== 401) {
    console.log(`   ❌ SECURITY ISSUE: Expected 401, got ${unauthResponse.status}`);
  } else if (!authRequired && !unauthResponse.ok) {
    console.log(`   ❌ PUBLIC ENDPOINT ISSUE: Expected success, got ${unauthResponse.status}`);
  }
  
  // Test with authentication (if required)
  if (authRequired) {
    const authResponse = await makeRequest(endpoint, {
      method,
      headers: { 'Authorization': `Bearer ${TOKEN}` },
      body: body ? JSON.stringify(body) : undefined
    });
    
    console.log(`   📤 With auth: ${authResponse.status} ${authResponse.ok ? 'OK' : 'FAIL'}`);
    if (authResponse.status === 404) {
      console.log(`   ❌ ROUTING ISSUE: Endpoint not found`);
    } else if (authResponse.status === 401) {
      console.log(`   ❌ AUTH ISSUE: Valid token rejected`);
    }
    
    return {
      endpoint,
      unauthStatus: unauthResponse.status,
      authStatus: authResponse.status,
      authWorking: unauthResponse.status === 401 && (authResponse.status >= 200 && authResponse.status < 300),
      routingWorking: authResponse.status !== 404
    };
  } else {
    return {
      endpoint,
      unauthStatus: unauthResponse.status,
      authStatus: 'N/A',
      authWorking: true,
      routingWorking: unauthResponse.status !== 404
    };
  }
}

async function runIndividualTests() {
  console.log('🧪 INDIVIDUAL ENDPOINT VALIDATION');
  console.log('='.repeat(80));
  
  const results = [];
  
  // Critical authenticated endpoints
  results.push(await testEndpoint('Applications List', '/applications', 'GET', true));
  results.push(await testEndpoint('Application Create', '/applications', 'POST', true, {
    step1: { requestedAmount: 25000, useOfFunds: 'equipment' },
    step3: { businessName: 'Test Co', industry: 'tech' },
    step4: { firstName: 'Test', lastName: 'User', email: 'test@example.com' }
  }));
  results.push(await testEndpoint('Lender Products', '/lender-products', 'GET', true));
  results.push(await testEndpoint('Upload Endpoint', '/upload/test-id', 'POST', true));
  
  // Public endpoints
  results.push(await testEndpoint('Public Lenders', '/public/lenders', 'GET', false));
  results.push(await testEndpoint('Health Check', '/health', 'GET', false));
  results.push(await testEndpoint('Health Z', '/healthz', 'GET', false));
  results.push(await testEndpoint('Version', '/version', 'GET', false));
  
  // Analysis
  console.log('\n📊 ENDPOINT ANALYSIS');
  console.log('='.repeat(80));
  
  const authIssues = results.filter(r => !r.authWorking);
  const routingIssues = results.filter(r => !r.routingWorking);
  
  console.log(`🔒 Authentication Issues: ${authIssues.length}`);
  authIssues.forEach(issue => {
    console.log(`   ❌ ${issue.endpoint}: Unauth=${issue.unauthStatus}, Auth=${issue.authStatus}`);
  });
  
  console.log(`🛣️  Routing Issues: ${routingIssues.length}`);
  routingIssues.forEach(issue => {
    console.log(`   ❌ ${issue.endpoint}: Status=${issue.authStatus || issue.unauthStatus}`);
  });
  
  const overallPass = authIssues.length === 0 && routingIssues.length === 0;
  const passRate = Math.round(((results.length - authIssues.length - routingIssues.length) / results.length) * 100);
  
  console.log(`\n🎯 Overall Pass Rate: ${passRate}%`);
  if (overallPass) {
    console.log('✅ ALL ENDPOINTS OPERATIONAL - READY FOR PRODUCTION');
  } else {
    console.log('❌ ISSUES REQUIRE IMMEDIATE ATTENTION');
  }
  
  return { results, authIssues, routingIssues, passRate };
}

runIndividualTests().catch(console.error);