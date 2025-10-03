/**
 * Test Localhost CORS Configuration
 * Verifies enhanced CORS setup on development server
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
        ...options.headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ 
          status: res.statusCode, 
          headers: res.headers, 
          data: data
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testLocalhostCors() {
  console.log('Testing Localhost Enhanced CORS Configuration\n');
  
  try {
    const result = await makeRequest('http://localhost:5000/api/auth/login', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://clientportal.replit.app',
        'Access-Control-Request-Method': 'POST'
      }
    });
    
    console.log('Response Status:', result.status);
    console.log('\nCORS Headers:');
    console.log('='.repeat(50));
    console.log('✓ Origin:', result.headers['access-control-allow-origin']);
    console.log('✓ Credentials:', result.headers['access-control-allow-credentials']);
    console.log('✓ Methods:', result.headers['access-control-allow-methods']);
    console.log('✓ Headers:', result.headers['access-control-allow-headers']);
    
    // Validation
    const hasCorrectOrigin = result.headers['access-control-allow-origin'] === 'https://clientportal.replit.app';
    const hasCredentials = result.headers['access-control-allow-credentials'] === 'true';
    
    console.log('\n' + '='.repeat(50));
    console.log('VALIDATION:');
    console.log(hasCorrectOrigin ? '✓ Origin correct' : '❌ Origin missing/incorrect');
    console.log(hasCredentials ? '✓ Credentials enabled' : '❌ Credentials missing/disabled');
    console.log(result.status === 200 ? '✓ Status 200 OK' : '❌ Unexpected status');
    
  } catch (error) {
    console.error('❌ Error testing localhost CORS:', error.message);
  }
}

testLocalhostCors();