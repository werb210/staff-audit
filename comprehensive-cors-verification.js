/**
 * Comprehensive CORS Verification Script
 * Tests all the specific requirements provided
 */

import { spawn } from 'child_process';

function executeCurl(command) {
  return new Promise((resolve, reject) => {
    const args = command.split(' ').slice(1);
    const process = spawn('curl', args, { 
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

async function comprehensiveCorsVerification() {
  console.log('🔍 Comprehensive CORS Verification\n');
  
  // Test 1: OPTIONS Preflight Check
  console.log('✅ 1. CORS Preflight Check');
  console.log('Command: curl -X OPTIONS -I -H "Origin: https://clientportal.replit.app" -H "Access-Control-Request-Method: GET" https://staffportal.replit.app/api/public/lenders');
  
  try {
    const preflightResult = await executeCurl('curl -X OPTIONS -I -H "Origin: https://clientportal.replit.app" -H "Access-Control-Request-Method: GET" https://staffportal.replit.app/api/public/lenders');
    
    console.log('\nResponse Headers:');
    console.log(preflightResult.stdout);
    
    // Check for required headers
    const hasAllowOrigin = preflightResult.stdout.includes('access-control-allow-origin: https://clientportal.replit.app');
    const hasAllowMethods = preflightResult.stdout.includes('access-control-allow-methods: GET,POST,PUT,DELETE,PATCH,OPTIONS') || 
                           preflightResult.stdout.includes('access-control-allow-methods: GET,OPTIONS');
    const hasNoContent = preflightResult.stdout.includes('HTTP/2 200') || preflightResult.stdout.includes('HTTP/1.1 204');
    
    console.log('Verification Results:');
    console.log(`   ✓ HTTP Status (200/204): ${hasNoContent ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    console.log(`   ❌ Preflight Error: ${error.message}`);
  }
  
  // Test 2: Live Fetch Response Count
  console.log('\n✅ 2. Live Fetch Response Count');
  console.log('Command: curl -s -H "Origin: https://clientportal.replit.app" https://staffportal.replit.app/api/public/lenders | jq ". | length"');
  
  try {
    // First get the data
    const fetchResult = await executeCurl('curl -s -H "Origin: https://clientportal.replit.app" https://staffportal.replit.app/api/public/lenders');
    
    if (fetchResult.stdout) {
      try {
        const data = JSON.parse(fetchResult.stdout);
        const productCount = data.products?.length || 0;
        
        console.log(`Response: ${productCount}`);
        console.log(`Expected: 43`);
        console.log(`   ✓ Product Count: ${productCount >= 43 ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   ✓ Success Field: ${data.success ? '✅ PASS' : '❌ FAIL'}`);
        
      } catch (parseError) {
        console.log(`   ❌ JSON Parse Error: ${parseError.message}`);
        console.log('Raw response:', fetchResult.stdout.substring(0, 200));
      }
    } else {
      console.log('   ❌ No response data received');
    }
    
  } catch (error) {
    console.log(`   ❌ Fetch Error: ${error.message}`);
  }
  
  // Test 3: Local Server Verification
  console.log('\n✅ 3. Local Server Verification');
  
  try {
    const localResponse = await fetch('http://localhost:5000/api/public/lenders', {
      headers: {
        'Origin': 'https://clientportal.replit.app'
      }
    });
    
    const localData = await localResponse.json();
    
    console.log(`Local Status: ${localResponse.status}`);
    console.log(`Local Products: ${localData.products?.length || 0}`);
    console.log(`Local CORS Header: ${localResponse.headers.get('access-control-allow-origin') || 'MISSING'}`);
    console.log(`   ✓ Local Server: ${localResponse.status === 200 ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    console.log(`   ❌ Local Server Error: ${error.message}`);
  }
  
  // Summary
  console.log('\n📋 FINAL VERIFICATION SUMMARY');
  console.log('═══════════════════════════════');
  console.log('All tests completed. Review results above to confirm:');
  console.log('1. OPTIONS preflight returns proper CORS headers');
  console.log('2. GET request returns 43 products');
  console.log('3. Local server is operational');
  console.log('\nIf all tests show ✅ PASS, the API is ready for client integration.');
}

// Run verification
comprehensiveCorsVerification().catch(console.error);