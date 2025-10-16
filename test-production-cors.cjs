/**
 * Test Production CORS Configuration
 * Tests the exact curl command specified by user
 */

const { execSync } = require('child_process');

function testProductionCors() {
  console.log('Testing Enhanced CORS Configuration\n');
  
  const curlCommand = `curl -I -X OPTIONS https://staffportal.replit.app/api/auth/login -H "Origin: https://clientportal.replit.app" -H "Access-Control-Request-Method: POST"`;
  
  try {
    console.log('Executing curl command:');
    console.log(curlCommand);
    console.log('\nResponse:');
    console.log('='.repeat(50));
    
    const result = execSync(curlCommand, { 
      encoding: 'utf8',
      timeout: 10000 
    });
    
    console.log(result);
    
    // Parse key headers from response
    const lines = result.split('\n');
    const statusLine = lines[0];
    const corsOrigin = lines.find(line => line.toLowerCase().includes('access-control-allow-origin'));
    const corsCredentials = lines.find(line => line.toLowerCase().includes('access-control-allow-credentials'));
    const corsMethods = lines.find(line => line.toLowerCase().includes('access-control-allow-methods'));
    const corsHeaders = lines.find(line => line.toLowerCase().includes('access-control-allow-headers'));
    
    console.log('\n' + '='.repeat(50));
    console.log('VERIFICATION RESULTS:');
    console.log('Status:', statusLine);
    if (corsOrigin) console.log('✓ Origin:', corsOrigin.trim());
    if (corsCredentials) console.log('✓ Credentials:', corsCredentials.trim());
    if (corsMethods) console.log('✓ Methods:', corsMethods.trim());
    if (corsHeaders) console.log('✓ Headers:', corsHeaders.trim());
    
    // Check for required values
    const hasCorrectOrigin = corsOrigin && corsOrigin.includes('https://clientportal.replit.app');
    const hasCredentials = corsCredentials && corsCredentials.includes('true');
    
    console.log('\n' + '='.repeat(50));
    console.log('VALIDATION:');
    console.log(hasCorrectOrigin ? '✓ Origin correct' : '❌ Origin missing/incorrect');
    console.log(hasCredentials ? '✓ Credentials enabled' : '❌ Credentials missing/disabled');
    
  } catch (error) {
    console.error('❌ Error executing curl command:', error.message);
    if (error.stdout) console.log('Stdout:', error.stdout);
    if (error.stderr) console.log('Stderr:', error.stderr);
  }
}

testProductionCors();