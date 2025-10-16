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

async function testAdvancedFeatures() {
  console.log('🚀 ADVANCED FEATURES END-TO-END TEST');
  console.log('====================================\n');
  
  let results = { passed: 0, failed: 0, total: 0 };
  const token = await getToken();
  
  // Test 1: CRM Integration
  console.log('👥 1. CRM SYSTEM TESTS');
  console.log('----------------------');
  
  try {
    // Test CRM contacts
    const contactsResult = await makeRequest('/api/crm/contacts', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (contactsResult.status === 200) {
      console.log('✅ CRM contacts API operational');
      results.passed++;
    } else {
      console.log('❌ CRM contacts API failed');
      results.failed++;
    }
    
    // Test CRM companies
    const companiesResult = await makeRequest('/api/crm/companies', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (companiesResult.status === 200) {
      console.log('✅ CRM companies API operational');
      results.passed++;
    } else {
      console.log('❌ CRM companies API failed');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ CRM test error:', error.message);
    results.failed += 2;
  }
  results.total += 2;
  
  // Test 2: Document Management
  console.log('\n📄 2. DOCUMENT MANAGEMENT TESTS');
  console.log('--------------------------------');
  
  try {
    // Test document listing
    const docsResult = await makeRequest('/api/documents', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (docsResult.status === 200) {
      console.log('✅ Document listing API operational');
      results.passed++;
    } else {
      console.log('❌ Document listing API failed');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Document management test error:', error.message);
    results.failed++;
  }
  results.total += 1;
  
  // Test 3: SignNow Integration
  console.log('\n📋 3. SIGNNOW INTEGRATION TESTS');
  console.log('-------------------------------');
  
  try {
    // Create a test application first
    const appData = {
      business: {
        businessName: "SignNow Test Business",
        industry: "technology",
        yearEstablished: 2020,
        employeeCount: 5,
        annualRevenue: 250000,
        monthlyRevenue: 20000,
        state: "CA",
        zipCode: "90210"
      },
      formFields: {
        requestedAmount: 75000,
        useOfFunds: "Equipment purchase",
        loanTerm: 24
      }
    };
    
    const createResult = await makeRequest('/api/public/applications', {
      method: 'POST',
      body: JSON.stringify(appData)
    });
    
    if (createResult.status === 200 && createResult.data.success) {
      const applicationId = createResult.data.applicationId;
      console.log(`✅ Test application created: ${applicationId}`);
      results.passed++;
      
      // Test SignNow queue initiation
      const signResult = await makeRequest(`/api/public/applications/${applicationId}/initiate-signing`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      
      if (signResult.status === 200 && signResult.data.success) {
        console.log('✅ SignNow queue initiation successful');
        console.log(`📋 Queue job ID: ${signResult.data.jobId}`);
        results.passed++;
      } else {
        console.log('❌ SignNow queue initiation failed');
        results.failed++;
      }
    } else {
      console.log('❌ Test application creation failed');
      results.failed += 2;
    }
  } catch (error) {
    console.log('❌ SignNow integration test error:', error.message);
    results.failed += 2;
  }
  results.total += 2;
  
  // Test 4: Banking Analysis
  console.log('\n💰 4. BANKING ANALYSIS TESTS');
  console.log('-----------------------------');
  
  try {
    const bankingResult = await makeRequest('/api/banking/analysis', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        applicationId: 'test-app-id',
        bankingData: {
          transactions: [
            { amount: 1000, date: '2025-01-01', description: 'Revenue' },
            { amount: -500, date: '2025-01-02', description: 'Expense' }
          ]
        }
      })
    });
    
    if (bankingResult.status === 200 || bankingResult.status === 404) {
      console.log('✅ Banking analysis API accessible');
      results.passed++;
    } else {
      console.log('❌ Banking analysis API failed');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Banking analysis test error:', error.message);
    results.failed++;
  }
  results.total += 1;
  
  // Test 5: Marketing System
  console.log('\n📢 5. MARKETING SYSTEM TESTS');
  console.log('-----------------------------');
  
  try {
    const marketingResult = await makeRequest('/api/marketing/campaigns', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (marketingResult.status === 200) {
      console.log('✅ Marketing campaigns API operational');
      results.passed++;
    } else {
      console.log('❌ Marketing campaigns API failed');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Marketing system test error:', error.message);
    results.failed++;
  }
  results.total += 1;
  
  // Test 6: Communications System  
  console.log('\n📞 6. COMMUNICATIONS SYSTEM TESTS');
  console.log('----------------------------------');
  
  try {
    const emailResult = await makeRequest('/api/communications/emails', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (emailResult.status === 200) {
      console.log('✅ Communications email API operational');
      results.passed++;
    } else {
      console.log('❌ Communications email API failed');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Communications system test error:', error.message);
    results.failed++;
  }
  results.total += 1;
  
  // Test 7: Risk Assessment
  console.log('\n⚖️  7. RISK ASSESSMENT TESTS');
  console.log('-----------------------------');
  
  try {
    const riskResult = await makeRequest('/api/risk/assess', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        applicationId: 'test-app-id'
      })
    });
    
    if (riskResult.status === 200 || riskResult.status === 404) {
      console.log('✅ Risk assessment API accessible');
      results.passed++;
    } else {
      console.log('❌ Risk assessment API failed');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Risk assessment test error:', error.message);
    results.failed++;
  }
  results.total += 1;
  
  // Test 8: Admin Functions
  console.log('\n🔧 8. ADMIN FUNCTION TESTS');
  console.log('---------------------------');
  
  try {
    const usersResult = await makeRequest('/api/rbac/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (usersResult.status === 200) {
      console.log('✅ Admin user management operational');
      results.passed++;
    } else {
      console.log('❌ Admin user management failed');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Admin functions test error:', error.message);
    results.failed++;
  }
  results.total += 1;
  
  // Final Results
  console.log('\n📊 ADVANCED FEATURES TEST RESULTS');
  console.log('==================================');
  console.log(`✅ Passed: ${results.passed}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
  
  if (results.passed === results.total) {
    console.log('\n🎉 ALL ADVANCED FEATURES OPERATIONAL');
  } else if (results.passed >= results.total * 0.8) {
    console.log('\n✅ MOST ADVANCED FEATURES OPERATIONAL');
  } else {
    console.log('\n⚠️ MULTIPLE ADVANCED FEATURES NEED ATTENTION');
  }
  
  return results;
}

testAdvancedFeatures().catch(console.error);
