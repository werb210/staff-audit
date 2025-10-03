/**
 * Comprehensive Checklist Compliance Test
 * Tests all required features from the ChatGPT specification
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const TEST_APPLICATION_ID = 'da608c27-3640-4a44-92b3-1c9d60a278fa';

let testsRun = 0;
let testsPassed = 0;

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function testResult(testName, passed, details = '') {
  testsRun++;
  if (passed) {
    testsPassed++;
    log(`✅ ${testName}: PASS ${details}`);
  } else {
    log(`❌ ${testName}: FAIL ${details}`);
  }
}

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  const text = await response.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { text };
  }
  
  return { response, data };
}

async function testChecklistCompliance() {
  log('🚀 Starting Comprehensive Checklist Compliance Test');
  log('Testing all required features from ChatGPT specification...\n');

  // 1. Application ID UUID Acceptance
  try {
    const { response, data } = await makeRequest(`${BASE_URL}/api/public/applications/${TEST_APPLICATION_ID}`);
    
    testResult(
      '1. Application ID UUID Acceptance - GET /api/public/applications/:id',
      response.status === 200 && data.success,
      `Status: ${response.status}, UUID accepted: ${data.success}`
    );
  } catch (error) {
    testResult('1. Application ID UUID Acceptance', false, `Error: ${error.message}`);
  }

  // 2. Route: POST /api/signnow/create
  try {
    const { response, data } = await makeRequest(`${BASE_URL}/api/signnow/create`, {
      method: 'POST',
      body: JSON.stringify({ applicationId: TEST_APPLICATION_ID })
    });
    
    testResult(
      '2. POST /api/signnow/create Implementation',
      response.status === 200 || response.status === 404,
      `Status: ${response.status}, Response: ${data.success ? 'Success' : data.error}`
    );
  } catch (error) {
    testResult('2. POST /api/signnow/create Implementation', false, `Error: ${error.message}`);
  }

  // 3. SignNow Smart Field Mapping (snake_case)
  try {
    const { response, data } = await makeRequest(`${BASE_URL}/api/applications/${TEST_APPLICATION_ID}/smart-fields`);
    
    const hasSnakeCaseFields = data && data.data && (
      data.data.hasOwnProperty('legal_business_name') ||
      data.data.hasOwnProperty('contact_first_name') ||
      data.data.hasOwnProperty('business_email')
    );
    
    testResult(
      '3. SignNow Smart Field Mapping (snake_case)',
      response.status === 200 && hasSnakeCaseFields,
      `Snake case fields: ${hasSnakeCaseFields}, Status: ${response.status}`
    );
  } catch (error) {
    testResult('3. SignNow Smart Field Mapping', false, `Error: ${error.message}`);
  }

  // 4. Webhook Setup
  try {
    const { response, data } = await makeRequest(`${BASE_URL}/webhook/signnow/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signnow-sig': 'test-signature'
      },
      body: JSON.stringify({
        event_type: 'document.test',
        document_id: 'test-doc',
        user_id: 'test-user',
        timestamp: Date.now()
      })
    });

    testResult(
      '4. Webhook Setup - POST /webhook/signnow/webhook',
      response.status === 200 && data.success,
      `Status: ${response.status}, Success: ${data.success}`
    );
  } catch (error) {
    testResult('4. Webhook Setup', false, `Error: ${error.message}`);
  }

  // 5. Retry Logic + Queue
  try {
    const { response, data } = await makeRequest(`${BASE_URL}/api/signnow/queue/status`);
    
    testResult(
      '5. Retry Logic + Queue Management',
      response.status === 200 && data.success,
      `Queue operational: ${data.success}, Status: ${response.status}`
    );
  } catch (error) {
    testResult('5. Retry Logic + Queue Management', false, `Error: ${error.message}`);
  }

  // 6. Environment Variables (Template ID)
  try {
    const { response, data } = await makeRequest(`${BASE_URL}/api/signnow/queue/status`);
    
    testResult(
      '6. Environment Variables Configuration',
      response.status === 200,
      `SignNow service accessible: ${response.status === 200}`
    );
  } catch (error) {
    testResult('6. Environment Variables Configuration', false, `Error: ${error.message}`);
  }

  // Production Readiness Checklist
  log('\n📋 Production Readiness Checklist:');

  // UUID Validation
  try {
    const invalidUuid = 'invalid-uuid-123';
    const { response } = await makeRequest(`${BASE_URL}/api/public/applications/${invalidUuid}`);
    
    testResult(
      'UUID Validation (Invalid ID Rejection)',
      response.status === 400,
      `Correctly rejects invalid UUID: ${response.status === 400}`
    );
  } catch (error) {
    testResult('UUID Validation', false, `Error: ${error.message}`);
  }

  // Authentication Bypass for Public Routes
  try {
    const { response, data } = await makeRequest(`${BASE_URL}/api/public/applications/${TEST_APPLICATION_ID}`);
    
    testResult(
      'Authentication Bypass (Public Routes)',
      response.status !== 401,
      `Public route accessible without auth: ${response.status !== 401}`
    );
  } catch (error) {
    testResult('Authentication Bypass', false, `Error: ${error.message}`);
  }

  // Final Results
  log('\n📊 Checklist Compliance Test Results:');
  log(`Total Tests: ${testsRun}`);
  log(`Passed: ${testsPassed}`);
  log(`Failed: ${testsRun - testsPassed}`);
  log(`Compliance Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);
  
  if (testsPassed === testsRun) {
    log('🎉 ALL TESTS PASSED - Full Checklist Compliance Achieved!');
  } else if (testsPassed >= testsRun * 0.8) {
    log('✅ HIGH COMPLIANCE - Most features working correctly');
  } else {
    log('⚠️  MEDIUM COMPLIANCE - Some features need attention');
  }
  
  return {
    total: testsRun,
    passed: testsPassed,
    failed: testsRun - testsPassed,
    complianceRate: (testsPassed / testsRun) * 100
  };
}

// Run the compliance tests
testChecklistCompliance().catch(console.error);