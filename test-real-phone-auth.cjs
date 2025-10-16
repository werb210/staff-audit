/**
 * Real Phone Number Authentication Test
 * Tests SMS OTP system with +1 587 888 1837
 */

const http = require('http');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://clientportal.replit.app',
        ...options.headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testRealPhoneRegistration() {
  console.log('Testing Registration with Real Phone Number');
  console.log('Phone: +1 587 888 1837');
  console.log('='.repeat(50));
  
  try {
    const response = await makeRequest('http://localhost:5000/api/auth/register', {
      method: 'POST',
      body: {
        phone: '+15878881837',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePass123!'
      }
    });
    
    console.log(`Status: ${response.statusCode}`);
    console.log(`CORS Origin: ${response.headers['access-control-allow-origin']}`);
    
    if (response.data) {
      try {
        const parsed = JSON.parse(response.data);
        console.log(`Response: ${JSON.stringify(parsed, null, 2)}`);
        
        if (parsed.message && parsed.message.includes('OTP')) {
          console.log('\nSMS OTP should be sent to +1 587 888 1837');
          console.log('Check your phone for the verification code');
        }
      } catch {
        console.log('Response: Non-JSON format');
      }
    }
    
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

async function testRealPhonePasswordReset() {
  console.log('\nTesting Password Reset with Real Phone Number');
  console.log('Phone: +1 587 888 1837');
  console.log('='.repeat(50));
  
  try {
    const response = await makeRequest('http://localhost:5000/api/auth/request-reset', {
      method: 'POST',
      body: {
        phone: '+15878881837'
      }
    });
    
    console.log(`Status: ${response.statusCode}`);
    console.log(`CORS Origin: ${response.headers['access-control-allow-origin']}`);
    
    if (response.data) {
      try {
        const parsed = JSON.parse(response.data);
        console.log(`Response: ${JSON.stringify(parsed, null, 2)}`);
        
        if (response.statusCode === 200) {
          console.log('\nPassword reset SMS should be sent to +1 587 888 1837');
          console.log('Check your phone for the reset instructions');
        }
      } catch {
        console.log('Response: Non-JSON format');
      }
    }
    
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

async function testRealPhoneLogin() {
  console.log('\nTesting Login with Real Phone Number');
  console.log('Phone: +1 587 888 1837');
  console.log('='.repeat(50));
  
  try {
    const response = await makeRequest('http://localhost:5000/api/auth/login', {
      method: 'POST',
      body: {
        phone: '+15878881837',
        password: 'SecurePass123!'
      }
    });
    
    console.log(`Status: ${response.statusCode}`);
    console.log(`CORS Origin: ${response.headers['access-control-allow-origin']}`);
    console.log(`Set-Cookie: ${response.headers['set-cookie'] ? 'Present' : 'Not Present'}`);
    
    if (response.data) {
      try {
        const parsed = JSON.parse(response.data);
        console.log(`Response: ${JSON.stringify(parsed, null, 2)}`);
      } catch {
        console.log('Response: Non-JSON format');
      }
    }
    
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

async function runRealPhoneTests() {
  console.log('Real Phone Number Authentication Test');
  console.log('Testing with +1 587 888 1837\n');
  
  await testRealPhoneRegistration();
  await testRealPhonePasswordReset();
  await testRealPhoneLogin();
  
  console.log('\n' + '='.repeat(60));
  console.log('REAL PHONE TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('The SMS authentication system is configured to send');
  console.log('real SMS messages to +1 587 888 1837');
  console.log('\nPlease check your phone for:');
  console.log('- Registration OTP codes');
  console.log('- Password reset messages');
  console.log('- Login verification codes (if 2FA enabled)');
}

runRealPhoneTests();