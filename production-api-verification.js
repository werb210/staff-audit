/**
 * Production API Verification Script
 * Tests all public lender endpoints on production deployment
 */

const BASE_URL = 'https://staffportal.replit.app';

async function makeRequest(url, options = {}) {
  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'Origin': 'https://clientportal.replit.app',
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    const duration = Date.now() - startTime;
    
    const responseData = await response.text();
    let jsonData;
    try {
      jsonData = JSON.parse(responseData);
    } catch (e) {
      jsonData = { raw: responseData };
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: jsonData,
      duration,
      url
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      url
    };
  }
}

async function testProductionEndpoints() {
  console.log('🚀 Production API Verification Started');
  console.log('🌐 Testing:', BASE_URL);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const tests = [
    {
      name: 'Health Check Endpoint',
      url: `${BASE_URL}/api/public/lenders/health`,
      expectedStatus: 200,
      expectedFields: ['status', 'count', 'timestamp']
    },
    {
      name: 'Debug Count Endpoint',
      url: `${BASE_URL}/api/public/lenders/debug/count`,
      expectedStatus: 200,
      expectedFields: ['success', 'count']
    },
    {
      name: 'Public Lenders Main Endpoint',
      url: `${BASE_URL}/api/public/lenders`,
      expectedStatus: 200,
      expectedFields: ['success', 'products', 'count'],
      checkCount: true
    },
    {
      name: 'Category Summary Endpoint',
      url: `${BASE_URL}/api/public/lenders/summary`,
      expectedStatus: 200,
      expectedFields: ['success', 'categories']
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n🔍 Testing: ${test.name}`);
    console.log(`📡 URL: ${test.url}`);
    
    const result = await makeRequest(test.url);
    
    // Check response
    const passed = result.ok && result.status === test.expectedStatus;
    console.log(`⏱️  Response Time: ${result.duration}ms`);
    console.log(`📊 Status: ${result.status} ${result.statusText}`);
    
    // Check CORS headers
    const corsHeaders = {
      'access-control-allow-origin': result.headers['access-control-allow-origin'],
      'access-control-allow-credentials': result.headers['access-control-allow-credentials'],
      'access-control-allow-methods': result.headers['access-control-allow-methods']
    };
    
    console.log('🌐 CORS Headers:', corsHeaders);
    
    // Check expected fields
    if (passed && result.data) {
      const missingFields = test.expectedFields.filter(field => !(field in result.data));
      if (missingFields.length === 0) {
        console.log('✅ All expected fields present');
        
        // Special checks
        if (test.checkCount && result.data.count) {
          console.log(`📊 Products Count: ${result.data.count}`);
          if (result.data.count >= 42) {
            console.log('✅ Product count meets minimum requirement (42+)');
          } else {
            console.log('❌ Product count below expected minimum');
          }
        }
        
        if (result.data.products && Array.isArray(result.data.products)) {
          console.log(`📋 Products Array Length: ${result.data.products.length}`);
          if (result.data.products.length > 0) {
            console.log('📝 Sample Product:', {
              id: result.data.products[0].id,
              productName: result.data.products[0].productName,
              lenderName: result.data.products[0].lenderName
            });
          }
        }
        
      } else {
        console.log('❌ Missing fields:', missingFields);
      }
    }
    
    // Overall result
    const testPassed = passed && 
      result.duration < 100 && 
      corsHeaders['access-control-allow-origin'] === 'https://clientportal.replit.app';
    
    console.log(testPassed ? '✅ TEST PASSED' : '❌ TEST FAILED');
    
    results.push({
      ...test,
      ...result,
      corsHeaders,
      testPassed
    });
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 PRODUCTION API VERIFICATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const passedTests = results.filter(r => r.testPassed).length;
  const totalTests = results.length;
  
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  console.log(`⏱️  Average Response Time: ${Math.round(results.reduce((acc, r) => acc + (r.duration || 0), 0) / results.length)}ms`);
  
  const failedTests = results.filter(r => !r.testPassed);
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`   - ${test.name}: ${test.error || `${test.status} ${test.statusText}`}`);
    });
  }
  
  console.log('\n🎯 Key Metrics:');
  const mainEndpoint = results.find(r => r.name === 'Public Lenders Main Endpoint');
  if (mainEndpoint && mainEndpoint.data) {
    console.log(`   📊 Total Products Available: ${mainEndpoint.data.count}`);
    console.log(`   🌐 CORS Configured: ${mainEndpoint.corsHeaders['access-control-allow-origin'] === 'https://clientportal.replit.app' ? 'YES' : 'NO'}`);
    console.log(`   ⚡ Performance: ${mainEndpoint.duration < 100 ? 'OPTIMAL' : 'NEEDS IMPROVEMENT'} (${mainEndpoint.duration}ms)`);
  }
  
  return {
    passed: passedTests === totalTests,
    results,
    summary: {
      passedTests,
      totalTests,
      averageResponseTime: Math.round(results.reduce((acc, r) => acc + (r.duration || 0), 0) / results.length)
    }
  };
}

// Run verification
testProductionEndpoints()
  .then(verification => {
    if (verification.passed) {
      console.log('\n🎉 ALL PRODUCTION ENDPOINTS VERIFIED SUCCESSFULLY!');
      console.log('🚀 API ready for client portal integration');
    } else {
      console.log('\n⚠️  Some tests failed - review results above');
    }
  })
  .catch(error => {
    console.error('❌ Verification failed:', error);
  });