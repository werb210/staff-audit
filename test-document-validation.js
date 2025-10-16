/**
 * Test script for document validation endpoints
 */

const baseUrl = 'http://localhost:5000';

// Test application IDs (replace with real ones from your database)
const testApplicationIds = [
  'cd696988-9c84-4b80-8fe3-1c86798d97ee',
  'babe2892-5b34-4e54-a610-b9321990a3a9'
];

async function testDocumentStateEndpoint() {
  console.log('\n🔍 Testing GET /api/public/applications/:id/documents');
  
  for (const appId of testApplicationIds) {
    try {
      const response = await fetch(`${baseUrl}/api/public/applications/${appId}/documents`);
      const data = await response.json();
      
      console.log(`\n📄 Application: ${appId}`);
      console.log(`Status: ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
      
      if (response.ok) {
        console.log(`✅ Found ${data.length} documents`);
      } else {
        console.log(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error(`❌ Network error for ${appId}:`, error.message);
    }
  }
}

async function testSignNowStatusWithDocuments() {
  console.log('\n🔍 Testing GET /api/public/signnow/status/:id (with document status)');
  
  for (const appId of testApplicationIds) {
    try {
      const response = await fetch(`${baseUrl}/api/public/signnow/status/${appId}`);
      const data = await response.json();
      
      console.log(`\n📝 Application: ${appId}`);
      console.log(`Status: ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
      
      if (response.ok) {
        console.log(`✅ SignNow Status: ${data.status}`);
        if (data.documentStatus) {
          console.log(`📊 Documents: ${data.documentStatus.totalUploaded}/${data.documentStatus.totalRequired}`);
          console.log(`📋 Complete: ${data.documentStatus.isComplete}`);
          if (data.documentStatus.missingTypes.length > 0) {
            console.log(`❌ Missing: ${data.documentStatus.missingTypes.join(', ')}`);
          }
        }
      } else {
        console.log(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error(`❌ Network error for ${appId}:`, error.message);
    }
  }
}

async function testSignNowInitiateValidation() {
  console.log('\n🔍 Testing POST /api/public/signnow/initiate/:id (document validation)');
  
  for (const appId of testApplicationIds) {
    try {
      const response = await fetch(`${baseUrl}/api/public/signnow/initiate/${appId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      console.log(`\n📝 Application: ${appId}`);
      console.log(`Status: ${response.status}`);
      console.log(`Response:`, JSON.stringify(data, null, 2));
      
      if (response.status === 400 && data.error === 'Missing required documents for signature step') {
        console.log(`✅ Document validation working - blocked signature due to missing documents`);
        console.log(`📋 Missing: ${data.missingDocuments?.join(', ')}`);
      } else if (response.ok) {
        console.log(`✅ Document validation passed - signature initiated`);
      } else {
        console.log(`❌ Unexpected error: ${data.error}`);
      }
    } catch (error) {
      console.error(`❌ Network error for ${appId}:`, error.message);
    }
  }
}

async function runTests() {
  console.log('🚀 Starting Document Validation Tests\n');
  
  await testDocumentStateEndpoint();
  await testSignNowStatusWithDocuments();
  await testSignNowInitiateValidation();
  
  console.log('\n✅ All tests completed!');
}

// Run the tests
runTests().catch(console.error);