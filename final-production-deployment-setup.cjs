/**
 * Final Production Deployment Setup & Verification
 * Ensures all production requirements are met before deployment
 */

const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

console.log('🚀 FINAL PRODUCTION DEPLOYMENT SETUP');
console.log('Ensuring all production requirements are met...');
console.log('');

async function validateProductionEnvironment() {
  console.log('🔧 PRODUCTION ENVIRONMENT VALIDATION');
  console.log('─'.repeat(50));
  
  const checks = [];
  
  function checkItem(name, condition, details, required = true) {
    const status = condition ? '✅' : (required ? '❌' : '⚠️');
    checks.push({ name, passed: condition, details, required });
    console.log(`${status} ${name}: ${details}`);
  }
  
  // 1. Environment Variables
  const nodeEnv = process.env.NODE_ENV;
  checkItem('NODE_ENV', nodeEnv === 'production', 
    nodeEnv ? `Set to "${nodeEnv}" (should be "production" for deployment)` : 'Not set', false);
  
  const jwtSecret = process.env.JWT_SECRET;
  checkItem('JWT_SECRET', jwtSecret && jwtSecret.length >= 64,
    jwtSecret ? `${jwtSecret.length} characters - ${jwtSecret.length >= 64 ? 'EXCELLENT' : 'WEAK'}` : 'Missing');
  
  checkItem('DATABASE_URL', !!process.env.DATABASE_URL,
    process.env.DATABASE_URL ? `Set (${process.env.DATABASE_URL.length} chars)` : 'Missing');
  
  checkItem('CLIENT_APP_SHARED_TOKEN', !!process.env.CLIENT_APP_SHARED_TOKEN,
    process.env.CLIENT_APP_SHARED_TOKEN ? `Set (${process.env.CLIENT_APP_SHARED_TOKEN.length} chars)` : 'Missing');
  
  // 2. Database Validation
  console.log('');
  console.log('🗄️ DATABASE PRODUCTION READINESS');
  console.log('─'.repeat(50));
  
  try {
    const lenderProducts = await sql`SELECT COUNT(*) as count FROM lender_products WHERE deleted_at IS NULL`;
    checkItem('Lender Products', lenderProducts[0].count >= 40,
      `${lenderProducts[0].count} active products in database`);
    
    const lenderCredentials = await sql`SELECT COUNT(*) as count FROM lender_credentials`;
    checkItem('Lender Credentials', lenderCredentials[0].count >= 3,
      `${lenderCredentials[0].count} credential records`);
    
    const categories = await sql`SELECT COUNT(DISTINCT category) as count FROM lender_products WHERE deleted_at IS NULL`;
    checkItem('Product Categories', categories[0].count >= 7,
      `${categories[0].count} product categories available`);
    
    const lenders = await sql`SELECT COUNT(DISTINCT lender_name) as count FROM lender_products WHERE deleted_at IS NULL`;
    checkItem('Unique Lenders', lenders[0].count >= 15,
      `${lenders[0].count} unique lenders in database`);
    
  } catch (error) {
    checkItem('Database Connectivity', false, error.message);
  }
  
  // 3. API Endpoints
  console.log('');
  console.log('🌐 CRITICAL API ENDPOINTS');
  console.log('─'.repeat(50));
  
  const criticalEndpoints = [
    '/api/version',
    '/api/public/lenders',
    '/api/lender-directory',
    '/api/applications'
  ];
  
  for (const endpoint of criticalEndpoints) {
    try {
      const response = await fetch(`http://localhost:5000${endpoint}`);
      const responseTime = Date.now();
      
      checkItem(`API ${endpoint}`, response.ok,
        response.ok ? `${response.status} OK` : `${response.status} ${response.statusText}`);
    } catch (error) {
      checkItem(`API ${endpoint}`, false, error.message);
    }
  }
  
  // 4. Security Validation
  console.log('');
  console.log('🔐 SECURITY PRODUCTION VALIDATION');
  console.log('─'.repeat(50));
  
  try {
    const hashedPasswords = await sql`
      SELECT COUNT(*) as count 
      FROM lender_credentials 
      WHERE password_hash LIKE '$2%'
    `;
    checkItem('Password Security', hashedPasswords[0].count > 0,
      `${hashedPasswords[0].count} bcrypt hashed passwords`);
  } catch (error) {
    checkItem('Password Security', false, 'Cannot verify password hashing');
  }
  
  // 5. Performance Metrics
  console.log('');
  console.log('📊 PERFORMANCE PRODUCTION READINESS');
  console.log('─'.repeat(50));
  
  const dbStartTime = Date.now();
  try {
    await sql`SELECT COUNT(*) FROM lender_products LIMIT 1`;
    const dbTime = Date.now() - dbStartTime;
    checkItem('Database Performance', dbTime < 500,
      `Query time: ${dbTime}ms (should be < 500ms)`);
  } catch (error) {
    checkItem('Database Performance', false, 'Database query failed');
  }
  
  // Generate Final Assessment
  console.log('');
  console.log('📋 PRODUCTION DEPLOYMENT ASSESSMENT');
  console.log('='.repeat(60));
  
  const requiredChecks = checks.filter(c => c.required);
  const optionalChecks = checks.filter(c => !c.required);
  
  const requiredPassed = requiredChecks.filter(c => c.passed).length;
  const totalRequired = requiredChecks.length;
  const optionalPassed = optionalChecks.filter(c => c.passed).length;
  const totalOptional = optionalChecks.length;
  
  console.log(`Required Checks: ${requiredPassed}/${totalRequired} (${Math.round(requiredPassed/totalRequired*100)}%)`);
  console.log(`Optional Checks: ${optionalPassed}/${totalOptional} (${Math.round(optionalPassed/totalOptional*100)}%)`);
  
  const overallPassed = checks.filter(c => c.passed).length;
  const overallTotal = checks.length;
  const overallPercentage = Math.round((overallPassed / overallTotal) * 100);
  
  console.log(`Overall Score: ${overallPassed}/${overallTotal} (${overallPercentage}%)`);
  
  if (requiredPassed === totalRequired) {
    console.log('');
    console.log('🎉 READY FOR PRODUCTION DEPLOYMENT!');
    console.log('');
    console.log('✅ All required checks passed');
    console.log('✅ Database fully operational');
    console.log('✅ API endpoints working');
    console.log('✅ Security measures implemented');
    console.log('✅ Performance within limits');
    console.log('');
    console.log('🚀 DEPLOYMENT INSTRUCTIONS:');
    console.log('');
    console.log('1. Set NODE_ENV=production in Replit Secrets');
    console.log('2. Ensure .replit uses "npm start" command');
    console.log('3. Click Deploy in Replit');
    console.log('4. Monitor deployment with post-deployment tests');
    console.log('');
    console.log('🔗 Production URLs to test:');
    console.log('   • https://staff.boreal.financial/api/version');
    console.log('   • https://staff.boreal.financial/api/public/lenders');
    console.log('   • https://staff.boreal.financial (main app)');
    
  } else {
    console.log('');
    console.log('❌ CRITICAL ISSUES MUST BE RESOLVED');
    console.log('');
    const failedRequired = requiredChecks.filter(c => !c.passed);
    failedRequired.forEach(check => {
      console.log(`❌ ${check.name}: ${check.details}`);
    });
  }
  
  // List optional improvements
  const failedOptional = optionalChecks.filter(c => !c.passed);
  if (failedOptional.length > 0) {
    console.log('');
    console.log('⚠️  OPTIONAL IMPROVEMENTS:');
    failedOptional.forEach(check => {
      console.log(`⚠️  ${check.name}: ${check.details}`);
    });
  }
  
  console.log('');
  console.log(`Production setup completed: ${new Date().toISOString()}`);
}

validateProductionEnvironment().catch(console.error);