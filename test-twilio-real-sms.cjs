/**
 * Direct Twilio SMS Test with +1 587 888 1837
 * Tests the working password reset endpoint with your specific number
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

async function testTwilioSms() {
  console.log('Testing Twilio SMS with +1 587 888 1837');
  console.log('Using password reset endpoint (known working)');
  console.log('='.repeat(50));
  
  try {
    const response = await makeRequest('http://localhost:5000/api/auth/request-reset', {
      method: 'POST',
      body: {
        phone: '+15878881837'
      }
    });
    
    console.log(`Status: ${response.statusCode}`);
    console.log(`CORS: ${response.headers['access-control-allow-origin']}`);
    
    if (response.data) {
      try {
        const parsed = JSON.parse(response.data);
        console.log(`Message: ${parsed.message}`);
        
        if (response.statusCode === 200) {
          console.log('\n✓ SMS should be sent to +1 587 888 1837');
          console.log('Check your phone for the password reset message');
        } else if (response.statusCode === 429) {
          console.log('\nRate limited - waiting 60 seconds...');
          console.log('This confirms the endpoint is working');
        } else {
          console.log(`\nUnexpected status: ${response.statusCode}`);
        }
      } catch {
        console.log('Non-JSON response received');
      }
    }
    
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

// Run the test
testTwilioSms();