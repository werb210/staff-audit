/**
 * CRM Twilio Integration Test Script
 * Tests the new Twilio logs endpoints for CRM integration
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const TEST_CONTACT_ID = 'test-contact-id';

// Test configuration
const testConfig = {
  contactId: TEST_CONTACT_ID,
  authToken: process.env.TEST_TOKEN || 'test-token',
  apiTimeout: 5000
};

async function testCrmTwilioEndpoints() {
  console.log('🧪 Testing CRM Twilio Integration Endpoints');
  console.log('=' .repeat(50));
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Get contact Twilio logs
  try {
    console.log('\n1. Testing GET /api/crm/contacts/:id/twilio-logs');
    const response = await axios.get(
      `${BASE_URL}/api/crm/contacts/${testConfig.contactId}/twilio-logs`,
      {
        headers: {
          'Authorization': `Bearer ${testConfig.authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: testConfig.apiTimeout
      }
    );
    
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   ✅ Response structure: ${JSON.stringify(Object.keys(response.data), null, 2)}`);
    results.passed++;
    results.tests.push({ name: 'Contact Twilio logs', status: 'PASS', response: response.status });
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.status || error.message}`);
    results.failed++;
    results.tests.push({ name: 'Contact Twilio logs', status: 'FAIL', error: error.message });
  }

  // Test 2: Get contact Twilio stats
  try {
    console.log('\n2. Testing GET /api/crm/contacts/:id/twilio-logs/stats');
    const response = await axios.get(
      `${BASE_URL}/api/crm/contacts/${testConfig.contactId}/twilio-logs/stats`,
      {
        headers: {
          'Authorization': `Bearer ${testConfig.authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: testConfig.apiTimeout
      }
    );
    
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   ✅ Stats structure: ${JSON.stringify(Object.keys(response.data), null, 2)}`);
    results.passed++;
    results.tests.push({ name: 'Contact Twilio stats', status: 'PASS', response: response.status });
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.status || error.message}`);
    results.failed++;
    results.tests.push({ name: 'Contact Twilio stats', status: 'FAIL', error: error.message });
  }

  // Test 3: Send quick reply
  try {
    console.log('\n3. Testing POST /api/crm/contacts/:id/twilio-logs/quick-reply');
    const response = await axios.post(
      `${BASE_URL}/api/crm/contacts/${testConfig.contactId}/twilio-logs/quick-reply`,
      {
        message: 'Test quick reply message from CRM integration'
      },
      {
        headers: {
          'Authorization': `Bearer ${testConfig.authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: testConfig.apiTimeout
      }
    );
    
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   ✅ Quick reply sent: ${JSON.stringify(response.data, null, 2)}`);
    results.passed++;
    results.tests.push({ name: 'Quick reply SMS', status: 'PASS', response: response.status });
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.status || error.message}`);
    results.failed++;
    results.tests.push({ name: 'Quick reply SMS', status: 'FAIL', error: error.message });
  }

  // Test 4: Search Twilio logs
  try {
    console.log('\n4. Testing GET /api/crm/contacts/:id/twilio-logs with search');
    const response = await axios.get(
      `${BASE_URL}/api/crm/contacts/${testConfig.contactId}/twilio-logs?q=test&page=1`,
      {
        headers: {
          'Authorization': `Bearer ${testConfig.authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: testConfig.apiTimeout
      }
    );
    
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   ✅ Search results: ${JSON.stringify(Object.keys(response.data), null, 2)}`);
    results.passed++;
    results.tests.push({ name: 'Search Twilio logs', status: 'PASS', response: response.status });
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.status || error.message}`);
    results.failed++;
    results.tests.push({ name: 'Search Twilio logs', status: 'FAIL', error: error.message });
  }

  // Test 5: Filtered logs by type
  try {
    console.log('\n5. Testing GET /api/crm/contacts/:id/twilio-logs with type filter');
    const response = await axios.get(
      `${BASE_URL}/api/crm/contacts/${testConfig.contactId}/twilio-logs?type=sms&page=1`,
      {
        headers: {
          'Authorization': `Bearer ${testConfig.authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: testConfig.apiTimeout
      }
    );
    
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   ✅ Filtered results: ${JSON.stringify(Object.keys(response.data), null, 2)}`);
    results.passed++;
    results.tests.push({ name: 'Type filtered logs', status: 'PASS', response: response.status });
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.status || error.message}`);
    results.failed++;
    results.tests.push({ name: 'Type filtered logs', status: 'FAIL', error: error.message });
  }

  // Print test summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 CRM TWILIO INTEGRATION TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  
  console.log('\n📋 Detailed Results:');
  results.tests.forEach((test, index) => {
    const status = test.status === 'PASS' ? '✅' : '❌';
    console.log(`   ${index + 1}. ${status} ${test.name} ${test.response ? `(${test.response})` : ''}`);
  });

  console.log('\n🎯 CRM INTEGRATION STATUS:');
  if (results.passed >= 3) {
    console.log('   ✅ CRM Twilio integration is OPERATIONAL');
    console.log('   ✅ Ready for Contact Modal integration');
  } else {
    console.log('   ⚠️  CRM integration needs fixes before deployment');
  }

  return results;
}

// Run the test
testCrmTwilioEndpoints()
  .then((results) => {
    process.exit(results.failed === 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });

export { testCrmTwilioEndpoints };