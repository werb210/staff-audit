#!/usr/bin/env node
/**
 * Verification script for tsx deployment method
 * Tests the exact command that will be used in production deployment
 */

const { spawn } = require('child_process');
const http = require('http');

async function testTsxDeployment() {
  console.log('Testing tsx deployment method...');
  
  // Start server with tsx using production configuration
  const server = spawn('npx', ['tsx', 'server/index.ts'], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: 5001 // Use different port to avoid conflicts
    },
    stdio: 'pipe'
  });

  let serverOutput = '';
  
  server.stdout.on('data', (data) => {
    serverOutput += data.toString();
    console.log('Server output:', data.toString().trim());
  });

  server.stderr.on('data', (data) => {
    console.error('Server error:', data.toString().trim());
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    // Test health endpoint
    const response = await makeRequest('http://localhost:5001/api/health');
    console.log('Health check response:', response);
    
    if (response.status === 'ok') {
      console.log('✅ tsx deployment method WORKS');
      console.log('✅ Server starts correctly with tsx');
      console.log('✅ API endpoints respond with JSON');
    } else {
      console.log('❌ Health check failed');
    }
  } catch (error) {
    console.error('❌ Failed to connect to server:', error.message);
  }

  // Cleanup
  server.kill('SIGTERM');
  
  return serverOutput.includes('Backend running on port 5001');
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

testTsxDeployment().catch(console.error);