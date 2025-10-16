const BASE_URL = 'http://localhost:5000';

async function makeRequest(url, options = {}) {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  const text = await response.text();
  try {
    return { status: response.status, data: JSON.parse(text) };
  } catch {
    return { status: response.status, data: text };
  }
}

async function runE2ETests() {
  console.log('🚀 COMPREHENSIVE END-TO-END TESTING');
  console.log('=====================================\n');
  
  let testResults = { passed: 0, failed: 0, total: 0 };
  
  // Test 1: Authentication System
  console.log('🔐 1. AUTHENTICATION TESTS');
  console.log('--------------------------');
  
  try {
    const loginResult = await makeRequest('/api/rbac/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@boreal.com',
        password: process.env.ADMIN_PASSWORD || 'admin123'
      })
    });
    
    if (loginResult.status === 200 && loginResult.data.success) {
      console.log('✅ Admin login successful');
      testResults.passed++;
      
      const token = loginResult.data.token;
      
      // Test authenticated endpoint
      const meResult = await makeRequest('/api/rbac/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (meResult.status === 200) {
        console.log('✅ Token validation working');
        testResults.passed++;
      } else {
        console.log('❌ Token validation failed');
        testResults.failed++;
      }
      
    } else {
      console.log('❌ Admin login failed');
      testResults.failed++;
    }
  } catch (error) {
    console.log('❌ Authentication test error:', error.message);
    testResults.failed++;
  }
  testResults.total += 2;
  
  // Test 2: Lender Products System
  console.log('\n📋 2. LENDER PRODUCTS TESTS');
  console.log('---------------------------');
  
  try {
    const lendersResult = await makeRequest('/api/lender-products');
    if (lendersResult.status === 200 && lendersResult.data.success) {
      const productCount = lendersResult.data.products.length;
      console.log(`✅ Lender products API: ${productCount} products`);
      testResults.passed++;
      
      // Test public API
      const publicResult = await makeRequest('/api/public/lenders');
      if (publicResult.status === 200 && publicResult.data.success) {
        console.log(`✅ Public lenders API: ${publicResult.data.products.length} products`);
        testResults.passed++;
      } else {
        console.log('❌ Public lenders API failed');
        testResults.failed++;
      }
    } else {
      console.log('❌ Lender products API failed');
      testResults.failed++;
    }
  } catch (error) {
    console.log('❌ Lender products test error:', error.message);
    testResults.failed++;
  }
  testResults.total += 2;
  
  // Test 3: Categories System
  console.log('\n🏷️ 3. CATEGORIES TESTS');
  console.log('----------------------');
  
  try {
    const categoriesResult = await makeRequest('/api/categories');
    if (categoriesResult.status === 200 && categoriesResult.data.success) {
      console.log(`✅ Categories API: ${categoriesResult.data.categories.length} categories`);
      console.log(`📋 Categories: ${categoriesResult.data.categories.join(', ')}`);
      testResults.passed++;
    } else {
      console.log('❌ Categories API failed');
      testResults.failed++;
    }
  } catch (error) {
    console.log('❌ Categories test error:', error.message);
    testResults.failed++;
  }
  testResults.total += 1;
  
  // Test 4: Application System
  console.log('\n📄 4. APPLICATION SYSTEM TESTS');
  console.log('-------------------------------');
  
  try {
    // Test public application creation
    const appData = {
      business: {
        businessName: "Test Business E2E",
        industry: "technology",
        yearEstablished: 2020,
        employeeCount: 5,
        annualRevenue: 250000,
        monthlyRevenue: 20000,
        state: "CA",
        zipCode: "90210"
      },
      formFields: {
        requestedAmount: 50000,
        useOfFunds: "Working capital",
        loanTerm: 12
      }
    };
    
    const createResult = await makeRequest('/api/public/applications', {
      method: 'POST',
      body: JSON.stringify(appData)
    });
    
    if (createResult.status === 200 && createResult.data.success) {
      console.log('✅ Public application creation successful');
      console.log(`📄 Application ID: ${createResult.data.applicationId}`);
      testResults.passed++;
      
      const applicationId = createResult.data.applicationId;
      
      // Test application retrieval
      const retrieveResult = await makeRequest(`/api/applications/${applicationId}`, {
        headers: { 'Authorization': `Bearer ${await getToken()}` }
      });
      
      if (retrieveResult.status === 200) {
        console.log('✅ Application retrieval successful');
        testResults.passed++;
      } else {
        console.log('❌ Application retrieval failed');
        testResults.failed++;
      }
    } else {
      console.log('❌ Public application creation failed');
      testResults.failed++;
    }
  } catch (error) {
    console.log('❌ Application system test error:', error.message);
    testResults.failed++;
  }
  testResults.total += 2;
  
  // Test 5: Health and System Status
  console.log('\n🏥 5. SYSTEM HEALTH TESTS');
  console.log('-------------------------');
  
  try {
    const healthResult = await makeRequest('/api/health');
    if (healthResult.status === 200 && healthResult.data.status === 'healthy') {
      console.log('✅ System health check passed');
      testResults.passed++;
    } else {
      console.log('❌ System health check failed');
      testResults.failed++;
    }
    
    const dbResult = await makeRequest('/debug-db');
    if (dbResult.status === 200 && dbResult.data.success) {
      console.log(`✅ Database connection: ${dbResult.data.totalProducts} products`);
      testResults.passed++;
    } else {
      console.log('❌ Database connection failed');
      testResults.failed++;
    }
  } catch (error) {
    console.log('❌ Health test error:', error.message);
    testResults.failed++;
  }
  testResults.total += 2;
  
  // Final Results
  console.log('\n📊 END-TO-END TEST RESULTS');
  console.log('===========================');
  console.log(`✅ Passed: ${testResults.passed}/${testResults.total}`);
  console.log(`❌ Failed: ${testResults.failed}/${testResults.total}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
  
  if (testResults.passed === testResults.total) {
    console.log('\n🎉 ALL TESTS PASSED - SYSTEM FULLY OPERATIONAL');
  } else if (testResults.passed >= testResults.total * 0.8) {
    console.log('\n✅ MOST TESTS PASSED - SYSTEM MOSTLY OPERATIONAL');
  } else {
    console.log('\n⚠️ MULTIPLE FAILURES - SYSTEM NEEDS ATTENTION');
  }
}

async function getToken() {
  const result = await makeRequest('/api/rbac/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@boreal.com',
      password: process.env.ADMIN_PASSWORD || 'admin123'
    })
  });
  return result.data.token;
}

// Run tests
runE2ETests().catch(console.error);
