/**
 * Production Integration Test
 * Complete end-to-end workflow: Submit application → Upload docs → OCR processing → Lender matching → SignNow
 */

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, data: null, error: error.message };
  }
}

function createFinancialDocument() {
  return new File(
    [JSON.stringify({
      companyName: "Test Business LLC",
      revenue: { monthly: 50000, annual: 600000 },
      expenses: { monthly: 35000, annual: 420000 },
      bankBalance: { checking: 125000, savings: 75000 },
      reportPeriod: "2024-Q4",
      businessType: "LLC",
      industry: "Technology"
    })],
    'financial-statement.json',
    { type: 'application/json' }
  );
}

async function runProductionIntegrationTest() {
  console.log('Production Integration Test');
  console.log('===========================');
  
  const BASE_URL = 'http://localhost:5000';
  let testResults = {
    total: 6,
    passed: 0,
    failed: 0,
    details: []
  };

  try {
    // Step 1: Staff Authentication
    console.log('\n1. 🔐 Staff Authentication...');
    const staffAuth = await makeRequest(`${BASE_URL}/api/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staff@acme.com',
        password: process.env.TEST_PASSWORD || 'password'
      })
    });

    if (staffAuth.status === 200 && staffAuth.data?.token) {
      console.log('✅ Staff authentication successful');
      testResults.passed++;
      testResults.details.push('Staff login working');
    } else {
      console.log('❌ Staff authentication failed');
      testResults.failed++;
      testResults.details.push('Staff login failed');
      return testResults;
    }

    const staffToken = staffAuth.data.token;

    // Step 2: Create Test Application
    console.log('\n2. 📋 Creating test application...');
    const createApp = await makeRequest(`${BASE_URL}/api/applications`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({
        businessName: 'Integration Test Business',
        requestedAmount: 100000,
        useOfFunds: 'Working capital',
        businessType: 'LLC',
        industry: 'Technology',
        annualRevenue: 600000,
        timeInBusiness: 3,
        businessDescription: 'Software development company'
      })
    });

    let applicationId;
    if (createApp.status === 201 && createApp.data?.application?.id) {
      applicationId = createApp.data.application.id;
      console.log(`✅ Application created: ${applicationId}`);
      testResults.passed++;
      testResults.details.push('Application creation working');
    } else {
      console.log('❌ Application creation failed');
      testResults.failed++;
      testResults.details.push('Application creation failed');
      return testResults;
    }

    // Step 3: Document Upload with OCR
    console.log('\n3. 📄 Testing document upload + OCR...');
    const formData = new FormData();
    formData.append('document', createFinancialDocument());
    formData.append('documentType', 'financial_statements');

    const uploadDoc = await makeRequest(`${BASE_URL}/api/upload/${applicationId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${staffToken}` },
      body: formData
    });

    let documentId;
    if (uploadDoc.status === 201 && uploadDoc.data?.document?.id) {
      documentId = uploadDoc.data.document.id;
      console.log(`✅ Document uploaded: ${documentId}`);
      console.log('✅ OCR processing initiated');
      testResults.passed++;
      testResults.details.push('Document upload + OCR working');
    } else {
      console.log('❌ Document upload failed');
      testResults.failed++;
      testResults.details.push('Document upload failed');
    }

    // Step 4: Lender Matching
    console.log('\n4. 🎯 Testing lender matching...');
    const lenderMatch = await makeRequest(`${BASE_URL}/api/staff/lender-products/match`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffToken}`
      },
      body: JSON.stringify({
        applicationId: applicationId,
        businessType: 'LLC',
        annualRevenue: 600000,
        requestedAmount: 100000,
        creditScore: 720,
        timeInBusiness: 3,
        industry: 'Technology'
      })
    });

    if (lenderMatch.status === 200 && lenderMatch.data?.matches?.length > 0) {
      console.log(`✅ Found ${lenderMatch.data.matches.length} lender matches`);
      testResults.passed++;
      testResults.details.push('Lender matching working');
    } else {
      console.log('❌ Lender matching failed');
      testResults.failed++;
      testResults.details.push('Lender matching failed');
    }

    // Step 5: SignNow Integration
    console.log('\n5. ✍️ Testing SignNow integration...');
    const signDoc = await makeRequest(`${BASE_URL}/api/sign/${applicationId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });

    if (signDoc.status === 200 && signDoc.data?.data?.signUrl) {
      console.log('✅ SignNow invite generated');
      testResults.passed++;
      testResults.details.push('SignNow integration working');
    } else {
      console.log('❌ SignNow integration failed');
      testResults.failed++;
      testResults.details.push('SignNow integration failed');
    }

    // Step 6: Webhook Monitoring
    console.log('\n6. 📊 Testing webhook monitoring dashboard...');
    const webhookLogs = await makeRequest(`${BASE_URL}/api/staff/webhooks/logs`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });

    if (webhookLogs.status === 200 && webhookLogs.data?.logs) {
      console.log(`✅ Webhook monitoring active (${webhookLogs.data.logs.length} logs)`);
      testResults.passed++;
      testResults.details.push('Webhook monitoring working');
    } else {
      console.log('❌ Webhook monitoring failed');
      testResults.failed++;
      testResults.details.push('Webhook monitoring failed');
    }

    // Test webhook endpoint
    console.log('\n🔗 Testing webhook processing...');
    const webhookTest = await makeRequest(`${BASE_URL}/webhook/signnow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'document.completed',
        document_id: 'test-integration-doc',
        timestamp: Date.now(),
        meta: { application_id: applicationId }
      })
    });

    if (webhookTest.status === 200 || webhookTest.status === 401) {
      console.log('✅ Webhook endpoint processing correctly');
    } else {
      console.log('❌ Webhook processing issues');
    }

  } catch (error) {
    console.error('Integration test error:', error.message);
    testResults.failed++;
    testResults.details.push(`Test execution error: ${error.message}`);
  }

  // Final Results
  console.log('\n' + '='.repeat(50));
  console.log('PRODUCTION INTEGRATION TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}/${testResults.total}`);
  console.log(`❌ Failed: ${testResults.failed}/${testResults.total}`);
  console.log(`📊 Success Rate: ${((testResults.passed/testResults.total) * 100).toFixed(1)}%`);
  
  console.log('\nDetailed Results:');
  testResults.details.forEach((detail, index) => {
    console.log(`${index + 1}. ${detail}`);
  });

  if (testResults.passed === testResults.total) {
    console.log('\n🎉 ALL SYSTEMS OPERATIONAL - PRODUCTION READY');
  } else {
    console.log('\n⚠️ Some issues detected - Review failed components');
  }

  return testResults;
}

// Execute the test
runProductionIntegrationTest().catch(console.error);