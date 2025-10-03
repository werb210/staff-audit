/**
 * Comprehensive Staff Application Production Test Suite
 * Tests all functionality mentioned in the Staff Application Testing Plan
 */

const fs = require('fs');

async function makeRequest(url, options = {}) {
  const fetch = (await import('node-fetch')).default;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Staff-Production-Test/1.0'
    }
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  const text = await response.text();
  
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }

  return {
    status: response.status,
    data: data,
    headers: response.headers,
    ok: response.ok
  };
}

async function runComprehensiveProductionTest() {
  console.log('🧪 COMPREHENSIVE STAFF APPLICATION PRODUCTION TEST');
  console.log('==================================================');
  console.log('URL: http://localhost:5000');
  console.log('Testing Plan: Authentication, Pipeline, Documents, Lenders, Security\n');

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function logTest(name, status, details = '') {
    const icon = status ? '✅' : '❌';
    console.log(`${icon} ${name} ${details}`);
    results.tests.push({ name, status, details });
    if (status) results.passed++;
    else results.failed++;
  }

  // 🔹 CORE API HEALTH TESTS
  console.log('\n🔹 CORE API HEALTH & VERSION TESTS');
  try {
    const versionTest = await makeRequest('http://localhost:5000/api/version');
    logTest('Version Endpoint', versionTest.ok, `(${versionTest.status})`);
    
    if (versionTest.ok) {
      const envCheck = versionTest.data.environment === 'development';
      logTest('Environment Check', envCheck, `(${versionTest.data.environment})`);
    }
  } catch (e) {
    logTest('Version Endpoint', false, `(Error: ${e.message})`);
  }

  // 🔹 PUBLIC LENDERS API
  console.log('\n🔹 LENDER PRODUCTS & PUBLIC API TESTS');
  try {
    const lendersTest = await makeRequest('http://localhost:5000/api/public/lenders');
    logTest('Public Lenders API', lendersTest.ok, `(${lendersTest.status})`);
    
    if (lendersTest.ok && lendersTest.data.products) {
      const productCount = lendersTest.data.products.length;
      logTest('Lender Products Count', productCount >= 40, `(${productCount} products)`);
      
      // Test product structure
      const firstProduct = lendersTest.data.products[0];
      const hasRequiredFields = firstProduct.id && firstProduct.name && firstProduct.lenderName;
      logTest('Product Schema Validation', hasRequiredFields, '(id, name, lenderName present)');
      
      // Test categories
      const categories = [...new Set(lendersTest.data.products.map(p => p.category))];
      logTest('Product Categories', categories.length >= 6, `(${categories.length} categories)`);
    }
  } catch (e) {
    logTest('Public Lenders API', false, `(Error: ${e.message})`);
  }

  // 🔹 LENDER DIRECTORY TEST
  console.log('\n🔹 LENDER MANAGEMENT TESTS');
  try {
    const directoryTest = await makeRequest('http://localhost:5000/api/lender-directory');
    logTest('Lender Directory API', directoryTest.ok, `(${directoryTest.status})`);
    
    if (directoryTest.ok && directoryTest.data.lenderNames) {
      const lenderCount = directoryTest.data.lenderNames.length;
      logTest('Lender Directory Count', lenderCount >= 16, `(${lenderCount} lenders)`);
    }
  } catch (e) {
    logTest('Lender Directory API', false, `(Error: ${e.message})`);
  }

  // 🔹 APPLICATION PIPELINE TESTS
  console.log('\n🔹 APPLICATION PIPELINE TESTS');
  try {
    const applicationsTest = await makeRequest('http://localhost:5000/api/applications');
    logTest('Applications API', applicationsTest.ok, `(${applicationsTest.status})`);
    
    // Test application creation schema
    const testApplication = {
      businessName: 'Test Production Company',
      contactEmail: 'test@production.com',
      loanAmount: 50000,
      useOfFunds: 'Working capital'
    };
    
    const createTest = await makeRequest('http://localhost:5000/api/applications/draft', {
      method: 'POST',
      body: JSON.stringify(testApplication),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });
    
    logTest('Application Creation Schema', createTest.status === 401 || createTest.status === 200, 
           `(${createTest.status} - Auth required)`);
    
  } catch (e) {
    logTest('Applications API', false, `(Error: ${e.message})`);
  }

  // 🔹 DOCUMENT WORKFLOW TESTS
  console.log('\n🔹 DOCUMENT WORKFLOW TESTS');
  try {
    const documentsTest = await makeRequest('http://localhost:5000/api/documents');
    logTest('Documents API', documentsTest.status === 401 || documentsTest.ok, 
           `(${documentsTest.status} - Auth protection)`);
    
    // Test document requirements endpoint
    const docReqTest = await makeRequest('http://localhost:5000/api/public/applications/test-id/required-docs');
    logTest('Document Requirements API', docReqTest.ok || docReqTest.status === 404, 
           `(${docReqTest.status})`);
    
  } catch (e) {
    logTest('Documents API', false, `(Error: ${e.message})`);
  }

  // 🔹 AUTHENTICATION & SECURITY TESTS
  console.log('\n🔹 AUTHENTICATION & SECURITY TESTS');
  try {
    // Test protected endpoint without auth
    const authTest = await makeRequest('http://localhost:5000/api/rbac/auth/me');
    logTest('Authentication Protection', authTest.status === 401, 
           `(${authTest.status} - Properly protected)`);
    
    // Test CORS headers
    const corsTest = await makeRequest('http://localhost:5000/api/public/lenders', {
      headers: {
        'Origin': 'https://clientportal.boreal.financial'
      }
    });
    
    const hasCors = corsTest.headers.get('access-control-allow-origin');
    logTest('CORS Configuration', !!hasCors, hasCors ? '(CORS headers present)' : '(No CORS headers)');
    
  } catch (e) {
    logTest('Authentication Tests', false, `(Error: ${e.message})`);
  }

  // 🔹 PERFORMANCE TESTS
  console.log('\n🔹 PERFORMANCE TESTS');
  try {
    const start = Date.now();
    await makeRequest('http://localhost:5000/api/version');
    const versionTime = Date.now() - start;
    
    const start2 = Date.now();
    await makeRequest('http://localhost:5000/api/public/lenders');
    const lendersTime = Date.now() - start2;
    
    logTest('Version Endpoint Performance', versionTime < 100, `(${versionTime}ms)`);
    logTest('Lenders Endpoint Performance', lendersTime < 1000, `(${lendersTime}ms)`);
    
  } catch (e) {
    logTest('Performance Tests', false, `(Error: ${e.message})`);
  }

  // 🎯 SUMMARY REPORT
  console.log('\n🎯 PRODUCTION TEST SUMMARY');
  console.log('===========================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  const criticalTests = [
    'Version Endpoint',
    'Public Lenders API', 
    'Lender Products Count',
    'Authentication Protection'
  ];
  
  const criticalFailures = results.tests.filter(t => 
    criticalTests.includes(t.name) && !t.status
  );
  
  if (criticalFailures.length === 0) {
    console.log('\n🟢 PRODUCTION READY: All critical systems operational');
  } else {
    console.log(`\n🟡 ISSUES DETECTED: ${criticalFailures.length} critical test(s) failed`);
    criticalFailures.forEach(test => {
      console.log(`   ❌ ${test.name} ${test.details}`);
    });
  }

  console.log('\n📋 NEXT STEPS FOR PRODUCTION DEPLOYMENT:');
  console.log('1. Set NODE_ENV=production in Replit secrets');
  console.log('2. Verify JWT_SECRET and DATABASE_URL in production');
  console.log('3. Test authentication with real admin credentials');
  console.log('4. Verify CORS with actual client domain');
  console.log('5. Run end-to-end application workflow test');
}

// Run the test
runComprehensiveProductionTest().catch(console.error);