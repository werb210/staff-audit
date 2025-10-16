/**
 * Final CORS Verification Test
 * Tests the exact register endpoint with updated CORS configuration
 */

const { execSync } = require('child_process');

function testFinalCors() {
  console.log('Final CORS Verification Test\n');
  
  const curlCommand = `curl -i -X OPTIONS https://staffportal.replit.app/api/auth/register -H "Origin: https://clientportal.replit.app" -H "Access-Control-Request-Method: POST"`;
  
  try {
    console.log('Testing: /api/auth/register endpoint');
    console.log('Command:', curlCommand);
    console.log('\nResponse:');
    console.log('='.repeat(60));
    
    const result = execSync(curlCommand, { 
      encoding: 'utf8',
      timeout: 10000 
    });
    
    console.log(result);
    
    // Parse key headers
    const lines = result.split('\n');
    const statusLine = lines[0];
    const corsOrigin = lines.find(line => line.toLowerCase().includes('access-control-allow-origin'));
    const corsCredentials = lines.find(line => line.toLowerCase().includes('access-control-allow-credentials'));
    
    console.log('='.repeat(60));
    console.log('VERIFICATION RESULTS:');
    console.log('Status:', statusLine);
    if (corsOrigin) console.log('Origin:', corsOrigin.trim());
    if (corsCredentials) console.log('Credentials:', corsCredentials.trim());
    
    // Check required values
    const hasCorrectOrigin = corsOrigin && corsOrigin.includes('https://clientportal.replit.app');
    const hasCredentials = corsCredentials && corsCredentials.includes('true');
    const isSuccess = statusLine && (statusLine.includes('200') || statusLine.includes('204'));
    
    console.log('\n' + '='.repeat(60));
    console.log('VALIDATION:');
    console.log(isSuccess ? '✓ Status successful' : '❌ Unexpected status');
    
    if (hasCorrectOrigin && hasCredentials && isSuccess) {
      console.log('\n🎉 CORS CONFIGURATION VERIFIED SUCCESSFULLY');
    } else {
      console.log('\n❌ CORS CONFIGURATION ISSUES DETECTED');
    }
    
  } catch (error) {
    console.error('❌ Error executing test:', error.message);
  }
}

testFinalCors();