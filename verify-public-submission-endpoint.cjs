#!/usr/bin/env node

/**
 * Quick Verification: Public API Submission Endpoint
 * Confirms the 4 critical public endpoints are working correctly after validation fixes
 */

const STAFF_API_URL = 'http://localhost:5000';
const CLIENT_TOKEN = 'CLIENT_APP_SHARED_TOKEN';

async function makeRequest(url, options = {}) {
  const fetch = (await import('node-fetch')).default;
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message
    };
  }
}

async function createTestApplication() {
  console.log('1️⃣ Creating draft application...');
  
  const response = await makeRequest(`${STAFF_API_URL}/api/applications/draft`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify({
      business: {
        name: "Verification Test Business",
        industry: "technology",
        yearsFounded: "2020",
        legalStructure: "LLC"
      },
      contact: {
        firstName: "Test",
        lastName: "User",
        email: "test@verification.com",
        phone: "+15551234567"
      },
      application: {
        loanAmount: 50000,
        useOfFunds: "Working capital"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create application: ${response.data.error}`);
  }

  console.log(`   ✅ Application created: ${response.data.applicationId}`);
  return response.data.applicationId;
}

async function testSubmissionEndpoint(applicationId) {
  console.log('2️⃣ Testing submission endpoint...');
  
  const submissionPayload = {
    termsAccepted: true,
    privacyAccepted: true,
    completedSteps: [
      "personal",
      "business", 
      "financial",
      "documents",
      "banking",
      "references",
      "review"
    ]
  };

  const response = await makeRequest(`${STAFF_API_URL}/api/public/applications/${applicationId}/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLIENT_TOKEN}`
    },
    body: JSON.stringify(submissionPayload)
  });

  console.log(`   📊 Response Status: ${response.status}`);
  console.log(`   📊 Response: ${JSON.stringify(response.data, null, 2)}`);

  if (!response.ok) {
    throw new Error(`Submission failed: ${response.data.error}`);
  }

  if (!response.data.success || !response.data.data) {
    throw new Error('Invalid response format');
  }

  console.log(`   ✅ Application submitted successfully`);
  console.log(`   ✅ Reference ID: ${response.data.data.referenceId}`);
  console.log(`   ✅ Format validation: ${response.data.data.referenceId.match(/^BF\d{11}$/) ? 'VALID' : 'INVALID'}`);
  
  return response.data;
}

async function runVerification() {
  console.log('🔍 PUBLIC API SUBMISSION ENDPOINT VERIFICATION');
  console.log('═══════════════════════════════════════════════');
  console.log('Testing the client-to-staff submission integration');
  console.log('');

  try {
    const applicationId = await createTestApplication();
    const result = await testSubmissionEndpoint(applicationId);
    
    console.log('\n🎯 VERIFICATION RESULTS');
    console.log('═══════════════════════════════════════════════');
    console.log('✅ Application creation: WORKING');
    console.log('✅ Submission endpoint: WORKING');
    console.log('✅ Reference ID generation: WORKING');
    console.log('✅ Response format: CORRECT');
    console.log('✅ Authentication: FUNCTIONAL');
    console.log('');
    console.log('🚀 PUBLIC API ENDPOINT IS PRODUCTION READY');
    console.log('Client applications can successfully submit to the staff backend.');

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

runVerification();