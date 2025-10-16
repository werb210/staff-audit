/**
 * Database Persistence Fix Verification Test
 * Tests the SignNow queue job processor database storage functionality
 * Validates complete workflow from document creation to database persistence
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function makeRequest(url, options = {}) {
  try {
    const response = await axios({
      url: `${BASE_URL}${url}`,
      method: options.method || 'GET',
      data: options.data,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

async function testDatabasePersistenceFix() {
  console.log('🧪 TESTING: Database Persistence Fix for SignNow Integration');
  console.log('=' .repeat(80));

  const testResults = {
    totalTests: 6,
    passedTests: 0,
    failedTests: [],
    details: {}
  };

  // ============================================
  // TEST 1: Create Test Application
  // ============================================
  console.log('\n📝 TEST 1: Create test application');
  
  const createAppResult = await makeRequest('/api/public/applications', {
    method: 'POST',
    data: {
      business: {
        businessName: 'Database Persistence Test Company',
        businessType: 'LLC',
        industry: 'Technology'
      },
      formFields: {
        businessName: 'Database Persistence Test Company',
        contactEmail: 'test@dbpersistence.com',
        requestedAmount: 50000,
        loanAmount: 50000,
        loanPurpose: 'Testing database persistence fix',
        useOfFunds: 'Testing database persistence fix'
      }
    }
  });

  if (createAppResult.success) {
    testResults.passedTests++;
    testResults.details.applicationId = createAppResult.data.applicationId;
    console.log(`✅ Application created: ${createAppResult.data.applicationId}`);
  } else {
    testResults.failedTests.push('Application creation failed');
    console.log(`❌ Application creation failed:`, createAppResult.error);
    return testResults;
  }

  const applicationId = testResults.details.applicationId;

  // ============================================
  // TEST 2: Initiate SignNow Signing (Queue Job)
  // ============================================
  console.log('\n🔗 TEST 2: Initiate SignNow signing process');
  
  const initiateResult = await makeRequest(`/api/public/applications/${applicationId}/initiate-signing`, {
    method: 'POST',
    data: {
      businessName: 'Database Persistence Test Company',
      contactEmail: 'test@dbpersistence.com',
      requestedAmount: 50000
    }
  });

  if (initiateResult.success) {
    testResults.passedTests++;
    testResults.details.jobId = initiateResult.data.jobId;
    console.log(`✅ SignNow initiated: Job ID ${initiateResult.data.jobId}`);
  } else {
    testResults.failedTests.push('SignNow initiation failed');
    console.log(`❌ SignNow initiation failed:`, initiateResult.error);
    return testResults;
  }

  const jobId = testResults.details.jobId;

  // ============================================
  // TEST 3: Wait for Job Completion
  // ============================================
  console.log('\n⏳ TEST 3: Wait for job completion (max 30 seconds)');
  
  let jobCompleted = false;
  let attempts = 0;
  const maxAttempts = 15; // 30 seconds with 2-second intervals

  while (!jobCompleted && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const jobStatusResult = await makeRequest(`/api/queue/job/${jobId}`);
    
    if (jobStatusResult.success && jobStatusResult.data.job) {
      const job = jobStatusResult.data.job;
      console.log(`   Attempt ${attempts + 1}: Job status = ${job.status}`);
      
      if (job.status === 'completed') {
        jobCompleted = true;
        testResults.passedTests++;
        testResults.details.jobResult = job.result;
        console.log(`✅ Job completed with result:`, job.result);
      } else if (job.status === 'failed') {
        testResults.failedTests.push('Job failed during processing');
        console.log(`❌ Job failed:`, job);
        return testResults;
      }
    }
    
    attempts++;
  }

  if (!jobCompleted) {
    testResults.failedTests.push('Job did not complete within timeout');
    console.log(`❌ Job did not complete within 30 seconds`);
    return testResults;
  }

  // ============================================
  // TEST 4: Verify Signing URL Generated
  // ============================================
  console.log('\n🔗 TEST 4: Verify signing URL was generated');
  
  const jobResult = testResults.details.jobResult;
  
  if (jobResult && jobResult.signingUrl) {
    testResults.passedTests++;
    testResults.details.signingUrl = jobResult.signingUrl;
    console.log(`✅ Signing URL generated: ${jobResult.signingUrl}`);
    console.log(`✅ Document ID: ${jobResult.documentId}`);
  } else {
    testResults.failedTests.push('No signing URL in job result');
    console.log(`❌ No signing URL found in job result:`, jobResult);
  }

  // ============================================
  // TEST 5: Check Database Update via API
  // ============================================
  console.log('\n💾 TEST 5: Verify application updated in database');
  
  const getAppResult = await makeRequest(`/api/public/applications/${applicationId}`);
  
  if (getAppResult.success && getAppResult.data) {
    const application = getAppResult.data;
    
    if (application.signUrl && application.signNowDocumentId) {
      testResults.passedTests++;
      testResults.details.databaseSignUrl = application.signUrl;
      testResults.details.databaseDocumentId = application.signNowDocumentId;
      console.log(`✅ Database updated successfully!`);
      console.log(`   signUrl: ${application.signUrl}`);
      console.log(`   signNowDocumentId: ${application.signNowDocumentId}`);
      console.log(`   status: ${application.status}`);
    } else {
      testResults.failedTests.push('Database not updated with signing URL');
      console.log(`❌ Database not updated - signUrl: ${application.signUrl}, signNowDocumentId: ${application.signNowDocumentId}`);
      console.log(`   Full application data:`, application);
    }
  } else {
    testResults.failedTests.push('Could not retrieve application from database');
    console.log(`❌ Could not retrieve application:`, getAppResult.error);
  }

  // ============================================
  // TEST 6: Test Signing URL API Endpoint
  // ============================================
  console.log('\n🔗 TEST 6: Test signing URL retrieval endpoint');
  
  const signingUrlResult = await makeRequest(`/api/public/applications/${applicationId}/signing-url`);
  
  if (signingUrlResult.success && signingUrlResult.data.signingUrl) {
    testResults.passedTests++;
    console.log(`✅ Signing URL endpoint working: ${signingUrlResult.data.signingUrl}`);
  } else {
    testResults.failedTests.push('Signing URL endpoint failed');
    console.log(`❌ Signing URL endpoint failed:`, signingUrlResult.error);
  }

  return testResults;
}

async function generateComprehensiveReport(testResults) {
  console.log('\n' + '=' .repeat(80));
  console.log('📊 DATABASE PERSISTENCE FIX TEST RESULTS');
  console.log('=' .repeat(80));

  const passRate = ((testResults.passedTests / testResults.totalTests) * 100).toFixed(1);
  
  console.log(`\n✅ Tests Passed: ${testResults.passedTests}/${testResults.totalTests} (${passRate}%)`);
  
  if (testResults.failedTests.length > 0) {
    console.log(`\n❌ Failed Tests:`);
    testResults.failedTests.forEach((failure, index) => {
      console.log(`   ${index + 1}. ${failure}`);
    });
  }

  console.log('\n📋 Test Details:');
  console.log(`   Application ID: ${testResults.details.applicationId || 'N/A'}`);
  console.log(`   Job ID: ${testResults.details.jobId || 'N/A'}`);
  console.log(`   Generated Signing URL: ${testResults.details.signingUrl || 'N/A'}`);
  console.log(`   Database Signing URL: ${testResults.details.databaseSignUrl || 'N/A'}`);
  console.log(`   Document ID: ${testResults.details.databaseDocumentId || 'N/A'}`);

  // Determine final status
  console.log('\n🎯 FINAL STATUS:');
  if (passRate >= 100) {
    console.log('🎉 DATABASE PERSISTENCE FIX: 100% OPERATIONAL!');
    console.log('✅ SignNow integration now fully production-ready');
  } else if (passRate >= 83) {
    console.log(`⚠️ DATABASE PERSISTENCE FIX: ${passRate}% OPERATIONAL`);
    console.log('🔧 Some issues remain - see failed tests above');
  } else {
    console.log(`❌ DATABASE PERSISTENCE FIX: ${passRate}% OPERATIONAL`);
    console.log('🚨 Major issues detected - review implementation');
  }

  return testResults;
}

async function runDatabasePersistenceTest() {
  try {
    console.log('🚀 Starting Database Persistence Fix Verification...\n');
    
    const testResults = await testDatabasePersistenceFix();
    await generateComprehensiveReport(testResults);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run the test
runDatabasePersistenceTest();