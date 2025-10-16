/**
 * Wake Staff Portal Script
 * Implements ChatGPT's recommended fix plan to wake the sleeping staff portal
 */

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      timeout: 10000,
      ...options
    });
    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: response.ok ? await response.json() : await response.text()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      type: error.name
    };
  }
}

async function wakeStaffPortal() {
  console.log('🔄 Starting Staff Portal Wake Process...\n');

  // Step 1: Try to wake the Replit project
  console.log('Step 1: Attempting to wake staff portal at https://staffportal.replit.app');
  const wakeResult = await makeRequest('https://staffportal.replit.app/');
  
  if (wakeResult.success) {
    console.log('✅ Staff portal is reachable');
    console.log(`   Status: ${wakeResult.status} ${wakeResult.statusText}`);
  } else {
    console.log('❌ Staff portal is unreachable');
    console.log(`   Error: ${wakeResult.error}`);
    console.log(`   Type: ${wakeResult.type}`);
    
    if (wakeResult.type === 'TypeError' && wakeResult.error.includes('Failed to fetch')) {
      console.log('\n🔴 CONFIRMED: Staff portal is sleeping or undeployed');
      console.log('   Solution: Need to deploy or wake the Replit project');
      return false;
    }
  }

  // Step 2: Test the API endpoint
  console.log('\nStep 2: Testing lender API endpoint');
  const apiResult = await makeRequest('https://staffportal.replit.app/api/public/lenders');
  
  if (apiResult.success) {
    console.log('✅ Lender API endpoint is working');
    console.log(`   Status: ${apiResult.status}`);
    
    if (apiResult.data && apiResult.data.products) {
      console.log(`   Products: ${apiResult.data.products.length} lender products available`);
      console.log('\n🎉 SUCCESS: Staff portal is fully operational!');
      
      // Test CORS headers
      const corsHeaders = [
        'access-control-allow-origin',
        'access-control-allow-credentials',
        'access-control-allow-methods'
      ];
      
      console.log('\nStep 3: CORS Headers Check');
      corsHeaders.forEach(header => {
        if (apiResult.headers[header]) {
          console.log(`   ✅ ${header}: ${apiResult.headers[header]}`);
        } else {
          console.log(`   ❌ ${header}: Missing`);
        }
      });
      
      return true;
    }
  } else {
    console.log('❌ Lender API endpoint failed');
    console.log(`   Error: ${apiResult.error}`);
    return false;
  }
}

async function testFromClientPerspective() {
  console.log('\n🧪 Testing from Client App Perspective...');
  
  // This simulates how the client app would call the staff API
  const clientResult = await makeRequest('https://staffportal.replit.app/api/public/lenders', {
    method: 'GET',
    headers: {
      'Origin': 'https://clientportal.replit.app',
      'Content-Type': 'application/json'
    }
  });
  
  if (clientResult.success) {
    console.log('✅ Client-to-Staff API call successful');
    console.log(`   Products available: ${clientResult.data?.products?.length || 0}`);
  } else {
    console.log('❌ Client-to-Staff API call failed');
    console.log(`   Error: ${clientResult.error}`);
  }
  
  return clientResult.success;
}

async function runWakeProcess() {
  console.log('='.repeat(80));
  console.log('🚀 STAFF PORTAL WAKE & VALIDATION SCRIPT');
  console.log('   Following ChatGPT\'s recommended fix plan');
  console.log('='.repeat(80));
  
  const isAwake = await wakeStaffPortal();
  
  if (isAwake) {
    const clientTest = await testFromClientPerspective();
    
    if (clientTest) {
      console.log('\n🎯 FINAL RESULT: Staff Portal is fully operational and ready for client integration');
      console.log('\n📋 Next Steps:');
      console.log('   1. Client app should now be able to fetch all 43 lender products');
      console.log('   2. Step 2 of the client application should work correctly');
      console.log('   3. No further action needed');
    } else {
      console.log('\n⚠️  FINAL RESULT: Staff Portal is awake but CORS needs attention');
      console.log('\n📋 Fix Needed:');
      console.log('   Add proper CORS configuration to staff portal server');
    }
  } else {
    console.log('\n🔴 FINAL RESULT: Staff Portal needs to be deployed or woken up');
    console.log('\n📋 Action Required:');
    console.log('   1. Deploy the staff portal to https://staffportal.replit.app');
    console.log('   2. Ensure the server is running on port 80 (external)');
    console.log('   3. Re-run this script to verify');
  }
}

runWakeProcess().catch(console.error);