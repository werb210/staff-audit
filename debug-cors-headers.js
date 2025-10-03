#!/usr/bin/env node

/**
 * Debug CORS Headers Issue
 * Investigates why curl shows missing headers while Node.js shows them correctly
 */

import https from 'https';
import { spawn } from 'child_process';

const STAFF_URL = 'https://staffportal.replit.app';
const CLIENT_ORIGIN = 'https://client.replit.app';

// Test with different curl variants
async function testCurlVariants() {
  console.log('🔍 Testing Different Curl Commands\n');

  const curlCommands = [
    'curl -I -X OPTIONS https://staffportal.replit.app/api/auth/user -H "Origin: https://client.replit.app" -H "Access-Control-Request-Method: GET"',
    'curl -v -X OPTIONS https://staffportal.replit.app/api/auth/user -H "Origin: https://client.replit.app" -H "Access-Control-Request-Method: GET"',
    'curl -s -D- -X OPTIONS https://staffportal.replit.app/api/auth/user -H "Origin: https://client.replit.app" -H "Access-Control-Request-Method: GET"'
  ];

  for (let i = 0; i < curlCommands.length; i++) {
    console.log(`\n${i + 1}. Testing: ${curlCommands[i].split(' ').slice(0, 5).join(' ')}...`);
    
    try {
      const result = await executeCurl(curlCommands[i]);
      console.log('   Exit Code:', result.code);
      console.log('   STDOUT Length:', result.stdout.length);
      console.log('   STDERR Length:', result.stderr.length);
      
      // Check for CORS headers
      const stdout = result.stdout.toLowerCase();
      const stderr = result.stderr.toLowerCase();
      
      const allowOriginInStdout = stdout.includes('access-control-allow-origin');
      const allowOriginInStderr = stderr.includes('access-control-allow-origin');
      
      
      if (allowOriginInStdout || allowOriginInStderr) {
        console.log('   ✅ CORS headers found');
      } else {
        console.log('   ❌ CORS headers missing');
      }
      
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }
  }
}

// Test Node.js request for comparison
async function testNodeRequest() {
  console.log('\n🔍 Node.js HTTPS Request Test\n');
  
  try {
    const response = await makeRequest(`${STAFF_URL}/api/auth/user`, {
      method: 'OPTIONS',
      headers: {
        'Origin': CLIENT_ORIGIN,
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    console.log('Status Code:', response.statusCode);
    console.log('Response Headers:');
    Object.keys(response.headers).forEach(key => {
      if (key.toLowerCase().includes('access-control')) {
        console.log(`  ${key}: ${response.headers[key]}`);
      }
    });
    
    // Check specifically for the headers we need
    const requiredHeaders = [
      'access-control-allow-origin',
      'access-control-allow-credentials',
      'access-control-allow-methods'
    ];
    
    console.log('\nRequired Headers Check:');
    requiredHeaders.forEach(header => {
      const value = response.headers[header];
      console.log(`  ${header}: ${value || 'MISSING'}`);
    });
    
  } catch (error) {
    console.log('❌ Node.js request failed:', error.message);
  }
}

// Test direct OPTIONS request to see raw response
async function testRawResponse() {
  console.log('\n🔍 Raw Response Analysis\n');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'staffportal.replit.app',
      port: 443,
      path: '/api/auth/user',
      method: 'OPTIONS',
      headers: {
        'Origin': CLIENT_ORIGIN,
        'Access-Control-Request-Method': 'GET'
      }
    };
    
    const req = https.request(options, (res) => {
      console.log('Status Code:', res.statusCode);
      console.log('Raw Headers Object:');
      console.log(JSON.stringify(res.headers, null, 2));
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Response Body Length:', data.length);
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Raw request error:', error.message);
      resolve();
    });
    
    req.end();
  });
}

function executeCurl(command) {
  return new Promise((resolve) => {
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
      resolve({
        code,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
    
    process.on('error', (error) => {
      resolve({
        code: -1,
        stdout: '',
        stderr: error.message
      });
    });
  });
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function runDebugTests() {
  console.log('🚀 CORS Headers Debug Analysis');
  console.log('===============================');
  
  await testCurlVariants();
  await testNodeRequest();
  await testRawResponse();
  
  console.log('\n📋 Analysis Summary');
  console.log('===================');
  console.log('This will help identify if the issue is with:');
  console.log('1. Curl command parsing');
  console.log('2. Server response headers');
  console.log('3. Network intermediaries');
  console.log('4. Response format differences');
}

runDebugTests().catch(console.error);