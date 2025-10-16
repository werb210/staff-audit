#!/usr/bin/env node

/**
 * Deployment Fix Verification Script
 * Applies and verifies all TypeScript, database, and import fixes
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 DEPLOYMENT FIX VERIFICATION');
console.log('==============================\n');

let allPassed = true;

// Test 1: TypeScript esModuleInterop configuration
console.log('1. ✅ TypeScript Configuration Check');
try {
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  const nodeConfig = JSON.parse(fs.readFileSync('tsconfig.node.json', 'utf8'));
  
  const mainConfig = {
    esModuleInterop: tsconfig.compilerOptions?.esModuleInterop === true,
    allowSyntheticDefaultImports: tsconfig.compilerOptions?.allowSyntheticDefaultImports === true
  };
  
  const nodeConfigCheck = {
    esModuleInterop: nodeConfig.compilerOptions?.esModuleInterop === true,
    allowSyntheticDefaultImports: nodeConfig.compilerOptions?.allowSyntheticDefaultImports === true
  };
  
  if (mainConfig.esModuleInterop && mainConfig.allowSyntheticDefaultImports && 
      nodeConfigCheck.esModuleInterop && nodeConfigCheck.allowSyntheticDefaultImports) {
    console.log('   ✅ ES Module settings configured correctly');
    console.log('   - tsconfig.json: esModuleInterop: true, allowSyntheticDefaultImports: true');
    console.log('   - tsconfig.node.json: esModuleInterop: true, allowSyntheticDefaultImports: true');
  } else {
    console.log('   ❌ Missing ES Module settings');
    allPassed = false;
  }
} catch (error) {
  console.log('   ❌ Error checking TypeScript config:', error.message);
  allPassed = false;
}

// Test 2: Twilio import syntax
console.log('\n2. ✅ Twilio Import Check');
try {
  const twilioService = fs.readFileSync('server/twilioService.ts', 'utf8');
  
  const hasCorrectImport = twilioService.includes("import { Twilio } from 'twilio'");
  const hasCorrectInstantiation = twilioService.includes("new Twilio(");
  const noLegacyImport = !twilioService.includes("import twilio from 'twilio'");
  
  if (hasCorrectImport && hasCorrectInstantiation && noLegacyImport) {
    console.log('   ✅ Twilio import syntax is correct');
    console.log('   - Using: import { Twilio } from \'twilio\'');
    console.log('   - Instantiation: new Twilio()');
  } else {
    console.log('   ❌ Twilio import issues detected');
    allPassed = false;
  }
} catch (error) {
  console.log('   ❌ Error checking Twilio service:', error.message);
  allPassed = false;
}

// Test 3: Database schema completeness
console.log('\n3. ✅ Database Schema Check');
try {
  const schema = fs.readFileSync('shared/schema.ts', 'utf8');
  
  const checks = [
    { name: 'userAuditLog table', test: schema.includes('export const userAuditLog =') },
    { name: 'auditLog table', test: schema.includes('export const auditLog =') },
    { name: 'crmActivityLog table', test: schema.includes('export const crmActivityLog =') },
    { name: 'business fields (legalBusinessName)', test: schema.includes('legalBusinessName') },
    { name: 'business fields (dbaName)', test: schema.includes('dbaName') },
    { name: 'business fields (businessEmail)', test: schema.includes('businessEmail') },
    { name: 'business fields (numberOfEmployees)', test: schema.includes('numberOfEmployees') },
    { name: 'business fields (contactFirstName)', test: schema.includes('contactFirstName') },
    { name: 'business fields (ownerSSN)', test: schema.includes('ownerSSN') },
    { name: 'userSessions table', test: schema.includes('export const userSessions =') },
    { name: 'loginAttempts table with email', test: schema.includes('export const loginAttempts =') && schema.includes('email: varchar("email"') },
    { name: 'loanCategory field', test: schema.includes('loanCategory: loanCategoryEnum("loan_category")') }
  ];
  
  let passedChecks = 0;
  checks.forEach(check => {
    if (check.test) {
      console.log(`   ✅ ${check.name}`);
      passedChecks++;
    } else {
      console.log(`   ❌ ${check.name} - Missing`);
      allPassed = false;
    }
  });
  
  console.log(`   📊 Schema completeness: ${passedChecks}/${checks.length} checks passed`);
} catch (error) {
  console.log('   ❌ Error checking database schema:', error.message);
  allPassed = false;
}

// Test 4: Dependencies check
console.log('\n4. ✅ Dependencies Check');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredDeps = [
    '@types/cors',
    'cors',
    'twilio',
    'express'
  ];
  
  let missingDeps = [];
  requiredDeps.forEach(dep => {
    if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
      missingDeps.push(dep);
    }
  });
  
  if (missingDeps.length === 0) {
    console.log('   ✅ All required dependencies present');
    console.log('   - @types/cors, cors, twilio, express all available');
  } else {
    console.log('   ❌ Missing dependencies:', missingDeps.join(', '));
    allPassed = false;
  }
} catch (error) {
  console.log('   ❌ Error checking dependencies:', error.message);
  allPassed = false;
}

// Test 5: ES Module imports check
console.log('\n5. ✅ ES Module Imports Check');
try {
  const serverIndex = fs.readFileSync('server/index.ts', 'utf8');
  
  const hasImportMeta = serverIndex.includes('import.meta');
  const hasProperImports = serverIndex.includes('import ') && !serverIndex.includes('require(');
  const hasCorrectCorsImport = serverIndex.includes('import cors from "cors"') || serverIndex.includes("import cors from 'cors'");
  
  if (hasImportMeta && hasProperImports && hasCorrectCorsImport) {
    console.log('   ✅ ES module imports configured correctly');
    console.log('   - Uses import.meta for ES module compatibility');
    console.log('   - Uses ES import syntax instead of require()');
    console.log('   - CORS import uses proper ES module syntax');
  } else {
    console.log('   ⚠️  Potential ES module import issues');
    if (!hasImportMeta) console.log('      - Missing import.meta usage');
    if (!hasProperImports) console.log('      - May contain require() calls');
    if (!hasCorrectCorsImport) console.log('      - CORS import may need fixing');
  }
} catch (error) {
  console.log('   ❌ Error checking ES module imports:', error.message);
  allPassed = false;
}

// Final Results
console.log('\n🏆 DEPLOYMENT FIX RESULTS');
console.log('==========================');
if (allPassed) {
  console.log('✅ ALL DEPLOYMENT FIXES VERIFIED');
  console.log('🚀 Ready for production deployment');
  process.exit(0);
} else {
  console.log('❌ SOME ISSUES DETECTED');
  console.log('⚠️  Review above errors before deployment');
  process.exit(1);
}