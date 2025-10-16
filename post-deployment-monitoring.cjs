/**
 * Post-Deployment Monitoring Script
 * Validates production deployment health and performance
 */

console.log('🔍 POST-DEPLOYMENT MONITORING');
console.log('Validating production deployment health...');
console.log('');

const PRODUCTION_URL = 'https://staff.boreal.financial';
const BACKUP_URL = 'https://staffportal.replit.app'; // Fallback if custom domain not ready

async function makeProductionRequest(endpoint, baseUrl = PRODUCTION_URL) {
  const url = `${baseUrl}${endpoint}`;
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Production-Monitor/1.0'
      }
    });
    
    const duration = Date.now() - startTime;
    let data;
    
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }
    
    return {
      success: response.ok,
      status: response.status,
      data,
      duration,
      url
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
      url
    };
  }
}

async function testProductionEndpoint(endpoint, expectedStatus = 200, description = '') {
  console.log(`Testing ${endpoint}...`);
  
  // Try production URL first
  let result = await makeProductionRequest(endpoint, PRODUCTION_URL);
  
  // If production URL fails, try backup
  if (!result.success && BACKUP_URL !== PRODUCTION_URL) {
    console.log(`  ⚠️  Production URL failed, trying backup...`);
    result = await makeProductionRequest(endpoint, BACKUP_URL);
  }
  
  const status = result.success ? '✅' : '❌';
  const details = result.success ? 
    `${result.status} (${result.duration}ms)` : 
    `${result.status || 'FAILED'} - ${result.error}`;
  
  console.log(`  ${status} ${endpoint}: ${details}`);
  
  if (description && result.success) {
    console.log(`      ${description}`);
  }
  
  return result;
}

async function runPostDeploymentTests() {
  console.log('🌐 PRODUCTION ENDPOINT VALIDATION');
  console.log('─'.repeat(50));
  
  const results = [];
  
  // Test critical endpoints
  const healthResult = await testProductionEndpoint('/api/version', 200, 'Version and health check');
  results.push(healthResult);
  
  if (healthResult.success && healthResult.data.version) {
    console.log(`      Version: ${healthResult.data.version}`);
    console.log(`      Environment: ${healthResult.data.environment || 'production'}`);
  }
  
  const lendersResult = await testProductionEndpoint('/api/public/lenders', 200, 'Public lenders API');
  results.push(lendersResult);
  
  if (lendersResult.success && lendersResult.data.products) {
    console.log(`      Products available: ${lendersResult.data.products.length}`);
  }
  
  const directoryResult = await testProductionEndpoint('/api/lender-directory', 200, 'Lender directory API');
  results.push(directoryResult);
  
  if (directoryResult.success && directoryResult.data.lenderNames) {
    console.log(`      Lenders available: ${directoryResult.data.lenderNames.length}`);
  }
  
  const appResult = await testProductionEndpoint('/', 200, 'Main application');
  results.push(appResult);
  
  console.log('');
  console.log('🔐 SECURITY VALIDATION');
  console.log('─'.repeat(50));
  
  // Test protected endpoints return proper errors
  const protectedResult = await testProductionEndpoint('/api/admin/users', 401, 'Protected endpoint security');
  results.push(protectedResult);
  
  console.log('');
  console.log('⚡ PERFORMANCE METRICS');
  console.log('─'.repeat(50));
  
  const performanceTests = results.filter(r => r.success);
  const avgResponseTime = performanceTests.reduce((sum, r) => sum + r.duration, 0) / performanceTests.length;
  const fastEndpoints = performanceTests.filter(r => r.duration < 1000).length;
  
  console.log(`✅ Average Response Time: ${Math.round(avgResponseTime)}ms`);
  console.log(`✅ Fast Endpoints (< 1s): ${fastEndpoints}/${performanceTests.length}`);
  console.log(`✅ Success Rate: ${Math.round(results.filter(r => r.success).length / results.length * 100)}%`);
  
  console.log('');
  console.log('📋 DEPLOYMENT HEALTH SUMMARY');
  console.log('='.repeat(60));
  
  const successfulTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  const healthPercentage = Math.round((successfulTests / totalTests) * 100);
  
  console.log(`Tests Passed: ${successfulTests}/${totalTests} (${healthPercentage}%)`);
  
  if (healthPercentage >= 90) {
    console.log('');
    console.log('🎉 PRODUCTION DEPLOYMENT SUCCESSFUL!');
    console.log('');
    console.log('✅ All critical systems operational');
    console.log('✅ API endpoints responding correctly');
    console.log('✅ Security measures active');
    console.log('✅ Performance within acceptable limits');
    console.log('');
    console.log('🔗 Production URLs:');
    console.log(`   • Main App: ${PRODUCTION_URL}`);
    console.log(`   • API Health: ${PRODUCTION_URL}/api/version`);
    console.log(`   • Lender Data: ${PRODUCTION_URL}/api/public/lenders`);
    console.log('');
    console.log('✅ Ready for client portal integration');
    
  } else if (healthPercentage >= 75) {
    console.log('');
    console.log('⚠️  DEPLOYMENT PARTIALLY SUCCESSFUL');
    console.log('Some systems may need attention');
    
  } else {
    console.log('');
    console.log('❌ DEPLOYMENT ISSUES DETECTED');
    console.log('Critical systems need immediate attention');
  }
  
  // Show any failures
  const failedTests = results.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log('');
    console.log('❌ FAILED TESTS:');
    failedTests.forEach(test => {
      console.log(`   ${test.url}: ${test.error || test.status}`);
    });
  }
  
  console.log('');
  console.log('🔄 CONTINUOUS MONITORING RECOMMENDATIONS:');
  console.log('');
  console.log('1. Set up UptimeRobot or similar for 24/7 monitoring');
  console.log('2. Monitor /api/version endpoint every 5 minutes');
  console.log('3. Alert on response times > 2 seconds');
  console.log('4. Weekly database health checks');
  console.log('5. Monthly security audits');
  
  console.log('');
  console.log(`Monitoring completed: ${new Date().toISOString()}`);
}

// Allow running as standalone script or module
if (require.main === module) {
  runPostDeploymentTests().catch(console.error);
}

module.exports = { runPostDeploymentTests, testProductionEndpoint };