/**
 * Production Deployment Verification Script
 * Comprehensive testing of deployed endpoints with browser console commands
 */

const PRODUCTION_URL = 'https://staffportal.replit.app';

async function verifyProductionDeployment() {
  console.log('🚀 PRODUCTION DEPLOYMENT VERIFICATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const tests = [
    {
      name: 'Health Check',
      url: `${PRODUCTION_URL}/api/public/lenders/health`,
      expectedStatus: 200,
      expectedFields: ['status', 'count'],
      description: 'API health monitoring endpoint'
    },
    {
      name: 'Main Public Lenders API',
      url: `${PRODUCTION_URL}/api/public/lenders`,
      expectedStatus: 200,
      expectedFields: ['success', 'products', 'count'],
      validateCount: true,
      description: 'Primary endpoint for client portal integration'
    },
    {
      name: 'Category Summary',
      url: `${PRODUCTION_URL}/api/public/lenders/summary`,
      expectedStatus: 200,
      expectedFields: ['success', 'categories'],
      description: 'Product category breakdown'
    },
    {
      name: 'Debug Count',
      url: `${PRODUCTION_URL}/api/public/lenders/debug/count`,
      expectedStatus: 200,
      expectedFields: ['success', 'count'],
      description: 'Production diagnostic endpoint'
    }
  ];

  const results = [];
  let allPassed = true;

  for (const test of tests) {
    console.log(`\n🔍 Testing: ${test.name}`);
    console.log(`📄 Description: ${test.description}`);
    console.log(`🌐 URL: ${test.url}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(test.url, {
        headers: {
          'Origin': 'https://clientportal.replit.app',
          'Content-Type': 'application/json'
        }
      });
      const duration = Date.now() - startTime;
      
      const data = await response.json();
      
      console.log(`⏱️  Response Time: ${duration}ms`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      // Check CORS headers
      const corsOrigin = response.headers.get('access-control-allow-origin');
      const corsCredentials = response.headers.get('access-control-allow-credentials');
      console.log(`🌐 CORS Origin: ${corsOrigin}`);
      console.log(`🔐 CORS Credentials: ${corsCredentials}`);
      
      // Validate response
      const statusPassed = response.status === test.expectedStatus;
      const corsOriginPassed = corsOrigin === 'https://clientportal.replit.app';
      const corsCredentialsPassed = corsCredentials === 'true';
      
      // Check expected fields
      const fieldsPassed = test.expectedFields.every(field => field in data);
      const missingFields = test.expectedFields.filter(field => !(field in data));
      
      if (fieldsPassed) {
        console.log('✅ All expected fields present');
      } else {
        console.log('❌ Missing fields:', missingFields);
      }
      
      // Special validation for count
      if (test.validateCount && data.count) {
        const countValue = parseInt(data.count);
        console.log(`📊 Products Count: ${countValue}`);
        if (countValue >= 42) {
          console.log('✅ Product count meets requirement (42+)');
        } else {
          console.log('❌ Product count below expected (42)');
          allPassed = false;
        }
        
        if (data.products && Array.isArray(data.products)) {
          console.log(`📋 Products Array Length: ${data.products.length}`);
          if (data.products.length === countValue) {
            console.log('✅ Count matches array length');
          } else {
            console.log('⚠️  Count mismatch with array length');
          }
          
          // Show sample product
          if (data.products.length > 0) {
            const sample = data.products[0];
            console.log('📝 Sample Product:', {
              id: sample.id?.substring(0, 8) + '...',
              productName: sample.productName,
              lenderName: sample.lenderName,
              category: sample.category
            });
          }
        }
      }
      
      const testPassed = statusPassed && corsOriginPassed && corsCredentialsPassed && fieldsPassed;
      
      if (testPassed) {
        console.log('✅ TEST PASSED');
      } else {
        console.log('❌ TEST FAILED');
        allPassed = false;
      }
      
      results.push({
        name: test.name,
        passed: testPassed,
        status: response.status,
        duration,
        data,
        corsOrigin,
        corsCredentials
      });
      
    } catch (error) {
      console.log('❌ TEST ERROR:', error.message);
      allPassed = false;
      results.push({
        name: test.name,
        passed: false,
        error: error.message
      });
    }
  }

  // Final Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 PRODUCTION VERIFICATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`📊 Tests Passed: ${passedCount}/${totalCount}`);
  
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED - PRODUCTION DEPLOYMENT VERIFIED');
    console.log('✅ API ready for client portal integration');
    
    const mainResult = results.find(r => r.name === 'Main Public Lenders API');
    if (mainResult && mainResult.data) {
      console.log(`\n🎯 Key Metrics:`);
      console.log(`   📊 Total Products: ${mainResult.data.count}`);
      console.log(`   ⚡ Response Time: ${mainResult.duration}ms`);
      console.log(`   🌐 CORS Configured: ${mainResult.corsOrigin === 'https://clientportal.replit.app' ? 'YES' : 'NO'}`);
    }
    
    console.log('\n📋 Browser Console Test Commands:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('// Test main endpoint:');
    console.log(`fetch('${PRODUCTION_URL}/api/public/lenders').then(r => r.json()).then(d => console.log('Success:', d.success, 'Count:', d.count, 'Products:', d.products.length))`);
    console.log('\n// Test health endpoint:');
    console.log(`fetch('${PRODUCTION_URL}/api/public/lenders/health').then(r => r.json()).then(d => console.log('Health:', d.status, 'Count:', d.count))`);
    
  } else {
    console.log('❌ SOME TESTS FAILED - REVIEW RESULTS ABOVE');
    
    const failedTests = results.filter(r => !r.passed);
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`   - ${test.name}: ${test.error || `${test.status} ${test.statusText || ''}`}`);
    });
  }
  
  return {
    allPassed,
    results,
    summary: {
      passed: passedCount,
      total: totalCount
    }
  };
}

// Export for use in browser or run directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.verifyProductionDeployment = verifyProductionDeployment;
  console.log('🔧 Production verification function loaded. Run: verifyProductionDeployment()');
} else {
  // Node environment
  verifyProductionDeployment().catch(console.error);
}