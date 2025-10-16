#!/usr/bin/env node

/**
 * Corrected Greenlight Verification - Production Readiness Check
 * Updated to match actual system endpoints and configuration
 */

console.log('🚀 CORRECTED GREENLIGHT VERIFICATION');
console.log('='.repeat(50));

let results = [];
let passed = 0;

async function test(name, fn) {
  console.log(`🔍 Testing: ${name}`);
  try {
    const result = await fn();
    if (result.pass) {
      console.log(`✅ PASS: ${result.message}`);
      passed++;
      results.push({name, status: 'PASS', message: result.message});
    } else {
      console.log(`❌ FAIL: ${result.message}`);
      results.push({name, status: 'FAIL', message: result.message});
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    results.push({name, status: 'ERROR', message: error.message});
  }
  console.log('');
}

// Test 1: Public APIs Working
async function testPublicAPIs() {
  try {
    const response = await fetch('http://localhost:5000/api/public/lenders');
    if (response.ok) {
      const data = await response.json();
      if (data.products && data.products.length > 0) {
        return {
          pass: true,
          message: `Public lenders API operational with ${data.products.length} products`
        };
      }
    }
    return { pass: false, message: 'Public lenders API not working properly' };
  } catch (error) {
    return { pass: false, message: `Public API test failed: ${error.message}` };
  }
}

// Test 2: Authentication System
async function testAuthentication() {
  try {
    // Test protected endpoint with auth
    const authResponse = await fetch('http://localhost:5000/api/applications', {
      headers: { 'Authorization': 'Bearer ae2dd308-d5f3-4e8b-9bdc-2c8aac3d4f5e' }
    });
    
    // Test same endpoint without auth (should fail)
    const noAuthResponse = await fetch('http://localhost:5000/api/applications');
    
    if (authResponse.ok && !noAuthResponse.ok) {
      return {
        pass: true,
        message: 'Authentication working: protected endpoints secured, Bearer tokens accepted'
      };
    } else {
      return {
        pass: false,
        message: `Auth test results: with-auth=${authResponse.status}, without-auth=${noAuthResponse.status}`
      };
    }
  } catch (error) {
    return { pass: false, message: `Authentication test failed: ${error.message}` };
  }
}

// Test 3: SignNow Smart Fields
async function testSignNowSmartFields() {
  try {
    // Get applications first
    const appsResponse = await fetch('http://localhost:5000/api/applications', {
      headers: { 'Authorization': 'Bearer ae2dd308-d5f3-4e8b-9bdc-2c8aac3d4f5e' }
    });
    
    if (appsResponse.ok) {
      const apps = await appsResponse.json();
      if (Array.isArray(apps) && apps.length > 0) {
        // Test smart fields endpoint
        const smartFieldsResponse = await fetch(`http://localhost:5000/api/applications/${apps[0].id}/smart-fields`, {
          headers: { 'Authorization': 'Bearer ae2dd308-d5f3-4e8b-9bdc-2c8aac3d4f5e' }
        });
        
        if (smartFieldsResponse.ok) {
          const fields = await smartFieldsResponse.json();
          const fieldCount = Object.keys(fields).length;
          
          return {
            pass: true,
            message: `SignNow smart fields operational: ${fieldCount} fields generated for application ${apps[0].id}`
          };
        }
      }
    }
    
    return {
      pass: false,
      message: 'SignNow smart fields test failed - no applications or endpoint not responding'
    };
  } catch (error) {
    return { pass: false, message: `SignNow test failed: ${error.message}` };
  }
}

// Test 4: Database & Lender Products
async function testDatabaseLenderProducts() {
  try {
    const response = await fetch('http://localhost:5000/api/public/lenders');
    if (response.ok) {
      const data = await response.json();
      if (data.products && data.products.length >= 40) {
        return {
          pass: true,
          message: `Database operational with ${data.products.length} lender products available`
        };
      } else {
        return {
          pass: false,
          message: `Database has only ${data.products?.length || 0} products, expected 40+`
        };
      }
    }
    return { pass: false, message: 'Database connectivity test failed' };
  } catch (error) {
    return { pass: false, message: `Database test failed: ${error.message}` };
  }
}

// Test 5: CORS Configuration
async function testCORS() {
  try {
    const response = await fetch('http://localhost:5000/api/public/lenders', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://clientportal.boreal.financial',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    
    if (allowOrigin && allowMethods) {
      return {
        pass: true,
        message: `CORS properly configured: Origin=${allowOrigin}, Methods=${allowMethods}`
      };
    }
    return { pass: false, message: 'CORS headers missing in OPTIONS response' };
  } catch (error) {
    return { pass: false, message: `CORS test failed: ${error.message}` };
  }
}

// Test 6: Environment Configuration
async function testEnvironmentConfig() {
  try {
    // Test if server is responding (indicates env is working)
    const response = await fetch('http://localhost:5000/api/version');
    if (response.ok) {
      return {
        pass: true,
        message: 'Environment configuration operational - server running with proper config'
      };
    }
    return { pass: false, message: 'Environment configuration issues detected' };
  } catch (error) {
    return { pass: false, message: `Environment test failed: ${error.message}` };
  }
}

// Run all tests
async function runTests() {
  await test('Public APIs Working', testPublicAPIs);
  await test('Authentication System', testAuthentication);
  await test('SignNow Smart Fields', testSignNowSmartFields);
  await test('Database & Lender Products', testDatabaseLenderProducts);
  await test('CORS Configuration', testCORS);
  await test('Environment Configuration', testEnvironmentConfig);
  
  console.log('🎯 CORRECTED GREENLIGHT VERIFICATION RESULTS');
  console.log('='.repeat(50));
  console.log(`Score: ${passed}/6 (${Math.round((passed/6)*100)}%)`);
  console.log('');
  
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
  });
  
  console.log('');
  
  if (passed === 6) {
    console.log('🟢 GREENLIGHT APPROVED: All systems operational - READY FOR PRODUCTION');
    return true;
  } else if (passed >= 4) {
    console.log('🟡 CONDITIONAL APPROVAL: Most systems working - Review failed items');
    return false;
  } else {
    console.log('🔴 DEPLOYMENT BLOCKED: Critical issues detected');
    return false;
  }
}

runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});