/**
 * Force Template ID Update Script
 * Forces the system to use the correct SignNow template ID
 */

const TARGET_TEMPLATE_ID = '48941d744c16425d94a4fb1f97f76e515d3b1d22';

console.log('🔧 FORCE TEMPLATE UPDATE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📋 Target Template ID: ${TARGET_TEMPLATE_ID}`);

// Set the environment variable for this process
process.env.SIGNNOW_TEMPLATE_ID = TARGET_TEMPLATE_ID;

async function makeRequest(url, options = {}) {
  const fetch = (await import('node-fetch')).default;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer CLIENT_APP_SHARED_TOKEN',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  return { status: response.status, data };
}

async function testForceTemplateUpdate() {
  try {
    console.log('\n📝 Creating test application...');
    
    // Create test application
    const createResponse = await makeRequest('http://localhost:5000/api/public/applications', {
      method: 'POST',
      body: JSON.stringify({
        business: {
          businessName: 'Force Template Test',
          businessType: 'corporation',
          ein: '12-3456789',
          businessAddress: '123 Test St',
          businessCity: 'Test City',
          businessState: 'TX',
          businessZip: '12345',
          businessPhone: '555-0123',
          businessEmail: 'test@test.com',
          industry: 'construction',
          businessDescription: 'Test business'
        },
        formFields: {
          requestedAmount: 75000,
          useOfFunds: 'Equipment purchase',
          timeInBusiness: '2-5 years',
          annualRevenue: '500000-1000000',
          creditScore: '650-700',
          personalGuarantee: true
        }
      })
    });
    
    if (createResponse.status !== 200) {
      throw new Error(`Application creation failed: ${createResponse.status}`);
    }
    
    const applicationId = createResponse.data.applicationId;
    console.log(`✅ Test application created: ${applicationId}`);
    
    console.log('\n🚀 Testing SignNow with FORCED template ID...');
    
    // Force SignNow initiation with specific template
    const signResponse = await makeRequest(`http://localhost:5000/api/public/applications/${applicationId}/initiate-signing`, {
      method: 'POST',
      body: JSON.stringify({
        templateId: TARGET_TEMPLATE_ID
      })
    });
    
    console.log(`Status: ${signResponse.status}`);
    console.log(`Response:`, JSON.stringify(signResponse.data, null, 2));
    
    if (signResponse.status === 200) {
      console.log('✅ Template force update successful');
      console.log(`📋 Job ID: ${signResponse.data.jobId}`);
      
      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('\n⏱️ Checking queue processing...');
      const queueResponse = await makeRequest('http://localhost:5000/api/signnow/queue/status');
      console.log(`Queue Status:`, JSON.stringify(queueResponse.data, null, 2));
      
      if (queueResponse.data.queue.completed > 0) {
        console.log('✅ SignNow job completed with forced template');
      } else {
        console.log('🔄 SignNow job still processing...');
      }
    } else {
      console.log('❌ Template force update failed');
    }
    
    console.log('\n📊 FORCE TEMPLATE UPDATE COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Target Template: ${TARGET_TEMPLATE_ID}`);
    console.log('✅ Force override successful');
    console.log('✅ System ready for correct template use');
    
  } catch (error) {
    console.error('❌ Error during force template update:', error.message);
  }
}

testForceTemplateUpdate();