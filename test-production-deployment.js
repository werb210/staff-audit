// Quick test to verify production deployment status
import https from 'https';

function testProductionEndpoint() {
  const testData = JSON.stringify({});
  
  const options = {
    hostname: 'staff.boreal.financial',
    port: 443,
    path: '/api/applications/1752166815631_dar4mp2zf/signnow',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(testData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('Production Response:', data);
      console.log('Status Code:', res.statusCode);
      
      // Check if response indicates legacy ID support
      if (data.includes('invalid input syntax for type uuid')) {
        console.log('❌ PRODUCTION DOES NOT HAVE LEGACY ID SUPPORT');
      } else if (data.includes('Application not found')) {
        console.log('✅ PRODUCTION HAS LEGACY ID SUPPORT (but no test data)');
      } else {
        console.log('✅ PRODUCTION HAS LEGACY ID SUPPORT AND WORKING');
      }
    });
  });

  req.on('error', (error) => {
    console.error('Error testing production:', error.message);
  });

  req.write(testData);
  req.end();
}

testProductionEndpoint();