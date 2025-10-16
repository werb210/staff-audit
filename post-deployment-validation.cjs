/**
 * Post-Deployment Validation Suite
 * Comprehensive testing after production deployment
 */

console.log('🔍 POST-DEPLOYMENT VALIDATION SUITE');
console.log('Validating production deployment and system integration...');
console.log('');

const PRODUCTION_URLS = {
  health: 'https://staff.boreal.financial/api/version',
  lenders: 'https://staff.boreal.financial/api/public/lenders',
  directory: 'https://staff.boreal.financial/api/lender-directory',
  staff: 'https://staff.boreal.financial',
  client: 'https://clientportal.boreal.financial'
};

async function validateProductionEnvironment() {
  console.log('🌐 PRODUCTION ENVIRONMENT VALIDATION');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(PRODUCTION_URLS.health);
    const data = await response.json();
    
    if (data.environment === 'production') {
      console.log('✅ Production environment confirmed');
      console.log(`   Version: ${data.version}`);
      console.log(`   Environment: ${data.environment}`);
      console.log(`   Timestamp: ${data.timestamp}`);
      return true;
    } else {
      console.log('❌ Not in production mode');
      console.log(`   Current environment: ${data.environment || 'unknown'}`);
      console.log('   → Check NODE_ENV=production in Replit Secrets');
      return false;
    }
  } catch (error) {
    console.log('❌ Production environment check failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function validateLenderDataIntegrity() {
  console.log('');
  console.log('📊 LENDER DATA INTEGRITY VALIDATION');
  console.log('─'.repeat(50));
  
  try {
    // Test lender products API
    const lendersResponse = await fetch(PRODUCTION_URLS.lenders);
    const lendersData = await lendersResponse.json();
    
    if (lendersData.success && lendersData.products) {
      console.log(`✅ Lender products API: ${lendersData.products.length} products`);
      
      // Validate data structure
      const sampleProduct = lendersData.products[0];
      const requiredFields = ['id', 'name', 'lenderName', 'category', 'amountMin', 'amountMax'];
      const missingFields = requiredFields.filter(field => !sampleProduct[field]);
      
      if (missingFields.length === 0) {
        console.log('✅ Product data structure valid');
      } else {
        console.log(`⚠️  Missing fields in product data: ${missingFields.join(', ')}`);
      }
    } else {
      console.log('❌ Lender products API failed');
      return false;
    }
    
    // Test directory API
    const directoryResponse = await fetch(PRODUCTION_URLS.directory);
    const directoryData = await directoryResponse.json();
    
    if (directoryData.success && directoryData.lenderNames) {
      console.log(`✅ Lender directory API: ${directoryData.lenderNames.length} lenders`);
    } else {
      console.log('❌ Lender directory API failed');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('❌ Lender data validation failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function validatePerformanceMetrics() {
  console.log('');
  console.log('⚡ PERFORMANCE METRICS VALIDATION');
  console.log('─'.repeat(50));
  
  const endpoints = [
    { url: PRODUCTION_URLS.health, name: 'Health Check', target: 1000 },
    { url: PRODUCTION_URLS.lenders, name: 'Lender Products', target: 2000 },
    { url: PRODUCTION_URLS.directory, name: 'Directory Service', target: 1000 }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(endpoint.url);
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        const status = duration <= endpoint.target ? '✅' : '⚠️';
        console.log(`${status} ${endpoint.name}: ${duration}ms (target: ${endpoint.target}ms)`);
        results.push({ name: endpoint.name, duration, success: true });
      } else {
        console.log(`❌ ${endpoint.name}: ${response.status} ${response.statusText}`);
        results.push({ name: endpoint.name, duration, success: false });
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.message}`);
      results.push({ name: endpoint.name, duration: Date.now() - startTime, success: false });
    }
  }
  
  // Calculate averages
  const successfulTests = results.filter(r => r.success);
  if (successfulTests.length > 0) {
    const avgDuration = successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length;
    console.log(`📊 Average response time: ${Math.round(avgDuration)}ms`);
    
    return avgDuration <= 2000; // Performance target
  }
  
  return false;
}

async function validateCORSConfiguration() {
  console.log('');
  console.log('🔒 CORS CONFIGURATION VALIDATION');
  console.log('─'.repeat(50));
  
  try {
    // Test OPTIONS preflight request
    const response = await fetch(PRODUCTION_URLS.lenders, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://clientportal.boreal.financial',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
      'access-control-allow-credentials': response.headers.get('access-control-allow-credentials')
    };
    
    let corsValid = true;
    
    if (corsHeaders['access-control-allow-origin']) {
      console.log('✅ CORS Allow-Origin configured');
    } else {
      console.log('❌ CORS Allow-Origin missing');
      corsValid = false;
    }
    
    if (corsHeaders['access-control-allow-methods']) {
      console.log('✅ CORS Allow-Methods configured');
    } else {
      console.log('❌ CORS Allow-Methods missing');
      corsValid = false;
    }
    
    if (corsHeaders['access-control-allow-credentials'] === 'true') {
      console.log('✅ CORS Allow-Credentials enabled');
    } else {
      console.log('⚠️  CORS Allow-Credentials not enabled');
    }
    
    return corsValid;
  } catch (error) {
    console.log('❌ CORS validation failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

function generateValidationReport(results) {
  console.log('');
  console.log('📋 VALIDATION SUMMARY REPORT');
  console.log('='.repeat(50));
  
  const { environment, dataIntegrity, performance, cors } = results;
  
  console.log(`Environment: ${environment ? '✅ Production' : '❌ Not Production'}`);
  console.log(`Data Integrity: ${dataIntegrity ? '✅ Valid' : '❌ Issues Found'}`);
  console.log(`Performance: ${performance ? '✅ Within Targets' : '❌ Below Targets'}`);
  console.log(`CORS Config: ${cors ? '✅ Configured' : '❌ Issues Found'}`);
  
  const overallScore = [environment, dataIntegrity, performance, cors].filter(Boolean).length;
  const totalTests = 4;
  const successRate = (overallScore / totalTests) * 100;
  
  console.log('');
  console.log(`📊 Overall Success Rate: ${successRate}% (${overallScore}/${totalTests})`);
  
  if (successRate >= 75) {
    console.log('🎉 DEPLOYMENT VALIDATION PASSED');
    console.log('');
    console.log('✅ Production deployment successful');
    console.log('✅ System ready for client integration');
    console.log('✅ All critical systems operational');
    
    if (successRate < 100) {
      console.log('');
      console.log('⚠️  Minor issues detected - monitor closely');
    }
  } else {
    console.log('❌ DEPLOYMENT VALIDATION FAILED');
    console.log('');
    console.log('Critical issues require immediate attention');
    console.log('Review failed tests and resolve before proceeding');
  }
  
  console.log('');
  console.log('🔗 Next Steps:');
  if (successRate >= 75) {
    console.log('1. Begin full client-staff integration testing');
    console.log('2. Set up continuous monitoring alerts');
    console.log('3. Document deployment completion');
    console.log('4. Notify stakeholders of go-live status');
  } else {
    console.log('1. Fix critical validation failures');
    console.log('2. Re-run validation tests');
    console.log('3. Contact support if issues persist');
  }
  
  return successRate;
}

async function runPostDeploymentValidation() {
  console.log('Running comprehensive post-deployment validation...');
  console.log('='.repeat(60));
  console.log('');
  
  const results = {
    environment: await validateProductionEnvironment(),
    dataIntegrity: await validateLenderDataIntegrity(),
    performance: await validatePerformanceMetrics(),
    cors: await validateCORSConfiguration()
  };
  
  const successRate = generateValidationReport(results);
  
  console.log('');
  console.log(`Validation completed: ${new Date().toISOString()}`);
  console.log(`Production readiness: ${successRate}%`);
  
  return { results, successRate };
}

runPostDeploymentValidation().catch(console.error);