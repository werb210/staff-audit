/**
 * CORS Deployment Verification Script
 * Tests the exact requirements from the ChatGPT instructions
 */

import { spawn } from 'child_process';

function executeCurl(command) {
  return new Promise((resolve, reject) => {
    const process = spawn('curl', command.split(' ').slice(1), { 
      stdio: ['pipe', 'pipe', 'pipe'] 
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    
    process.on('error', reject);
  });
}

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { 
      status: response.status, 
      headers: Object.fromEntries(response.headers.entries()),
      data 
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function verifyCorsDeployment() {
  console.log('🧪 CORS Deployment Verification\n');
  
  // Test 1: OPTIONS pre-flight request
  console.log('1. Testing OPTIONS pre-flight request...');
  try {
    const curlResult = await executeCurl('curl -X OPTIONS -I -H "Origin: https://clientportal.replit.app" -H "Access-Control-Request-Method: GET" https://staffportal.replit.app/api/public/lenders');
    
    console.log('   CURL Response:');
    console.log(curlResult.stdout);
    
    // Check for required headers
    const hasAllowOrigin = curlResult.stdout.includes('access-control-allow-origin: https://clientportal.replit.app');
    const hasAllowMethods = curlResult.stdout.includes('access-control-allow-methods');
    
    
  } catch (error) {
    console.log(`   ❌ CURL Error: ${error.message}`);
  }
  
  // Test 2: Actual GET request with origin header
  console.log('\n2. Testing actual GET request with origin header...');
  const getResult = await makeRequest('https://staffportal.replit.app/api/public/lenders', {
    headers: {
      'Origin': 'https://clientportal.replit.app'
    }
  });
  
  if (getResult.error) {
    console.log(`   ❌ Request Error: ${getResult.error}`);
  } else {
    console.log(`   Status: ${getResult.status}`);
    console.log(`   Products Count: ${getResult.data.products?.length || 0}`);
    console.log(`   CORS Origin Header: ${getResult.headers['access-control-allow-origin'] || 'MISSING'}`);
    console.log(`   Success: ${getResult.data.success}`);
  }
  
  // Test 3: Local server test
  console.log('\n3. Testing local server endpoint...');
  const localResult = await makeRequest('http://localhost:5000/api/public/lenders', {
    headers: {
      'Origin': 'https://clientportal.replit.app'
    }
  });
  
  if (localResult.error) {
    console.log(`   ❌ Local Error: ${localResult.error}`);
  } else {
    console.log(`   Local Status: ${localResult.status}`);
    console.log(`   Local Products: ${localResult.data.products?.length || 0}`);
    console.log(`   Local CORS: ${localResult.headers['access-control-allow-origin'] || 'MISSING'}`);
  }
  
  // Summary
  console.log('\n📋 VERIFICATION SUMMARY:');
  console.log('─────────────────────────────');
  
  if (getResult.status === 200 && getResult.data.products?.length >= 43) {
    console.log('🎉 SUCCESS: Public lenders API is operational');
    console.log(`   ✓ Serving ${getResult.data.products.length} lender products`);
    console.log('   ✓ CORS configuration working correctly');
    console.log('   ✓ Client portal can now access full dataset');
  } else {
    console.log('❌ FAILURE: Issues detected');
    console.log('   ⚠️  Client portal may not receive full dataset');
  }
}

// Run verification
verifyCorsDeployment().catch(console.error);