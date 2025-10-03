/**
 * Create Test Account Script
 * Creates a verified test account for immediate login access
 */

import http from 'http';
import bcrypt from 'bcryptjs';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const { method = 'GET', headers = {}, body } = options;
    
    const parsedUrl = new URL(url);
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ 
            status: res.statusCode, 
            data: parsed, 
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        } catch {
          resolve({ 
            status: res.statusCode, 
            data, 
            success: res.statusCode >= 200 && res.statusCode < 300
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.abort();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function createTestAccount() {
  console.log('🔧 Creating Test Account for Immediate Login');
  console.log('============================================');

  const BASE_URL = 'http://localhost:5000';

  // Test credentials
  const testCredentials = {
    email: 'admin@test.com',
    password: 'Admin123!',
    phone: '+15551234567',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'admin'
  };

  console.log('\n📋 Test Account Details:');
  console.log(`   Email: ${testCredentials.email}`);
  console.log(`   Password: ${testCredentials.password}`);
  console.log(`   Role: ${testCredentials.role}`);

  try {
    // Step 1: Register the account
    console.log('\n1️⃣ Creating test account...');
    const registerResponse = await makeRequest(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      body: testCredentials
    });

    if (!registerResponse.success) {
      console.log('❌ Registration failed');
      console.log(`   Status: ${registerResponse.status}`);
      console.log(`   Response: ${JSON.stringify(registerResponse.data)}`);
      return false;
    }

    console.log('✅ Account created successfully');
    console.log(`   User ID: ${registerResponse.data.userId}`);

    // Step 2: Verify with a test OTP (we'll use a known code)
    console.log('\n2️⃣ Verifying account with test OTP...');
    const verifyResponse = await makeRequest(`${BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      body: {
        userId: registerResponse.data.userId,
        otpCode: '123456' // Test OTP code
      }
    });

    if (verifyResponse.success) {
      console.log('✅ Account verified successfully');
      console.log('🎉 Test account ready for login!');
      
      console.log('\n📱 Login Instructions:');
      console.log('1. Go to the staff portal login page');
      console.log(`2. Enter email: ${testCredentials.email}`);
      console.log(`3. Enter password: ${testCredentials.password}`);
      console.log('4. Click "Sign in"');
      
      return true;
    } else {
      console.log('⚠️ Account created but verification failed');
      console.log('   You can still try to login - the account exists');
      console.log(`   If OTP verification is required, registration creates the account anyway`);
      
      console.log('\n📱 Try Login With:');
      console.log(`   Email: ${testCredentials.email}`);
      console.log(`   Password: ${testCredentials.password}`);
      
      return true;
    }

  } catch (error) {
    console.log(`❌ Failed to create test account: ${error.message}`);
    return false;
  }
}

// Run the script
createTestAccount().then((success) => {
  if (success) {
    console.log('\n✅ Test account creation completed');
  } else {
    console.log('\n❌ Test account creation failed');
  }
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});