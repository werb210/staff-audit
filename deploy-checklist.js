#!/usr/bin/env node

/**
 * Pre-Deployment Checklist Script
 * Verifies all deployment requirements are met
 */

import fs from 'fs';

console.log('🚀 PRE-DEPLOYMENT CHECKLIST');
console.log('============================\n');

let allReady = true;
let checksPassed = 0;
let totalChecks = 0;

function check(description, testFunction) {
  totalChecks++;
  console.log(`${totalChecks}. ${description}`);
  
  try {
    const result = testFunction();
    if (result) {
      console.log('   ✅ READY');
      checksPassed++;
    } else {
      console.log('   ❌ NOT READY');
      allReady = false;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    allReady = false;
  }
  console.log('');
}

// Check 1: Package.json has build and start scripts
check('Build and start scripts configured', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return packageJson.scripts?.build && packageJson.scripts?.start;
});

// Check 2: TypeScript configuration ready
check('TypeScript configuration ready for production', () => {
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  return tsconfig.compilerOptions?.esModuleInterop === true && 
         tsconfig.compilerOptions?.allowSyntheticDefaultImports === true;
});

// Check 3: Environment variables template exists
check('Environment variables documented', () => {
  return fs.existsSync('.env.example') || fs.existsSync('PRODUCTION_DEPLOYMENT_GUIDE.md');
});

// Check 4: Database schema is complete
check('Database schema complete', () => {
  const schema = fs.readFileSync('shared/schema.ts', 'utf8');
  return schema.includes('export const applications =') && 
         schema.includes('export const lenderProducts =') &&
         schema.includes('export const users =');
});

// Check 5: API routes are registered
check('API routes properly registered', () => {
  const routes = fs.readFileSync('server/routes.ts', 'utf8');
  const hasApplicationsRoute = routes.includes("'/api/applications'") || routes.includes("/api/applications");
  const hasPublicLendersRoute = routes.includes('public/lenders') || fs.existsSync('server/routes/publicLenders.ts');
  return hasApplicationsRoute && hasPublicLendersRoute;
});

// Check 6: Static file serving configured
check('Static file serving configured', () => {
  const serverIndex = fs.readFileSync('server/index.ts', 'utf8');
  return serverIndex.includes('express.static') || serverIndex.includes('serveStatic');
});

// Check 7: CORS configuration present
check('CORS configuration present', () => {
  const serverIndex = fs.readFileSync('server/index.ts', 'utf8');
  return serverIndex.includes('cors') && 
         (serverIndex.includes('clientportal.replit.app') || serverIndex.includes('allowedOrigins'));
});

// Check 8: Health endpoints available
check('Health monitoring endpoints available', () => {
  const routes = fs.readFileSync('server/routes.ts', 'utf8');
  return routes.includes('/health') || routes.includes('/version') || 
         fs.readFileSync('server/index.ts', 'utf8').includes('/api/health');
});

// Final Results
console.log('📊 DEPLOYMENT READINESS SUMMARY');
console.log('================================');
console.log(`✅ Checks Passed: ${checksPassed}/${totalChecks}`);
console.log(`📈 Readiness Score: ${((checksPassed/totalChecks) * 100).toFixed(1)}%`);

if (allReady) {
  console.log('\n🎉 DEPLOYMENT READY!');
  console.log('Your application is ready for production deployment.');
  console.log('\nNext steps:');
  console.log('1. Set environment variables in Replit Secrets');
  console.log('2. Configure deployment settings (npm run build, npm start)');
  console.log('3. Click Deploy in Replit');
  console.log('4. Monitor deployment logs');
} else {
  console.log('\n⚠️  DEPLOYMENT BLOCKED');
  console.log('Please resolve the issues above before deploying.');
}

process.exit(allReady ? 0 : 1);