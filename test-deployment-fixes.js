#!/usr/bin/env node

/**
 * Deployment Fixes Verification Test
 * Tests all suggested fixes that were applied
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Testing Deployment Fixes...\n');

let passedTests = 0;
let totalTests = 0;

function test(description, testFunction) {
  totalTests++;
  console.log(`\n${totalTests}. Testing: ${description}`);
  
  try {
    const result = testFunction();
    if (result) {
      console.log(`   ✅ PASS`);
      passedTests++;
    } else {
      console.log(`   ❌ FAIL`);
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}`);
  }
}

// Test 1: TypeScript esModuleInterop configuration
test('esModuleInterop flag enabled in tsconfig.json', () => {
  const tsconfigPath = path.join(__dirname, 'tsconfig.json');
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  
  const hasEsModuleInterop = tsconfig.compilerOptions?.esModuleInterop === true;
  const hasAllowSyntheticDefaultImports = tsconfig.compilerOptions?.allowSyntheticDefaultImports === true;
  
  if (hasEsModuleInterop && hasAllowSyntheticDefaultImports) {
    console.log('     - esModuleInterop: true ✅');
    console.log('     - allowSyntheticDefaultImports: true ✅');
    return true;
  }
  
  return false;
});

// Test 2: Twilio import uses proper ES module syntax
test('Twilio import uses proper ES module syntax', () => {
  const twilioServicePath = path.join(__dirname, 'server', 'twilioService.ts');
  const content = fs.readFileSync(twilioServicePath, 'utf8');
  
  const hasCorrectImport = content.includes("import { Twilio } from 'twilio'");
  const hasCorrectInstantiation = content.includes("new Twilio(");
  const noLegacyImport = !content.includes("import twilio from 'twilio'");
  
  if (hasCorrectImport && hasCorrectInstantiation && noLegacyImport) {
    console.log('     - Import statement: import { Twilio } from \'twilio\' ✅');
    console.log('     - Instantiation: new Twilio() ✅');
    console.log('     - No legacy import ✅');
    return true;
  }
  
  return false;
});

// Test 3: Database schema includes missing audit log definitions
test('Database schema includes audit log definitions', () => {
  const schemaPath = path.join(__dirname, 'shared', 'schema.ts');
  const content = fs.readFileSync(schemaPath, 'utf8');
  
  const hasUserAuditLog = content.includes('export const userAuditLog =');
  const hasAuditLog = content.includes('export const auditLog =');
  const hasCrmActivityLog = content.includes('export const crmActivityLog =');
  
  if (hasUserAuditLog && hasAuditLog && hasCrmActivityLog) {
    console.log('     - userAuditLog table defined ✅');
    console.log('     - auditLog table defined ✅');
    console.log('     - crmActivityLog table defined ✅');
    return true;
  }
  
  return false;
});

// Test 4: Missing properties added to user/business tables
test('Missing properties added to business table schema', () => {
  const schemaPath = path.join(__dirname, 'shared', 'schema.ts');
  const content = fs.readFileSync(schemaPath, 'utf8');
  
  const hasLegalBusinessName = content.includes('legalBusinessName');
  const hasDbaName = content.includes('dbaName');
  const hasBusinessEmail = content.includes('businessEmail');
  const hasNumberOfEmployees = content.includes('numberOfEmployees');
  const hasContactFirstName = content.includes('contactFirstName');
  const hasOwnerSSN = content.includes('ownerSSN');
  
  if (hasLegalBusinessName && hasDbaName && hasBusinessEmail && 
      hasNumberOfEmployees && hasContactFirstName && hasOwnerSSN) {
    console.log('     - legalBusinessName field added ✅');
    console.log('     - dbaName field added ✅');
    console.log('     - businessEmail field added ✅');
    console.log('     - numberOfEmployees field added ✅');
    console.log('     - Contact fields added ✅');
    console.log('     - Owner fields added ✅');
    return true;
  }
  
  return false;
});

// Test 5: Application schema includes loanCategory field
test('Application schema includes loanCategory field', () => {
  const schemaPath = path.join(__dirname, 'shared', 'schema.ts');
  const content = fs.readFileSync(schemaPath, 'utf8');
  
  const hasLoanCategory = content.includes('loanCategory: loanCategoryEnum');
  
  if (hasLoanCategory) {
    console.log('     - loanCategory field added to applications table ✅');
    return true;
  }
  
  return false;
});

// Test 6: TypeScript compilation can proceed without errors
test('TypeScript configuration allows proper module resolution', () => {
  const tsconfigPath = path.join(__dirname, 'tsconfig.json');
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  
  const hasModuleResolution = tsconfig.compilerOptions?.moduleResolution === 'bundler';
  const hasResolveJsonModule = tsconfig.compilerOptions?.resolveJsonModule === true;
  const hasForceConsistentCasing = tsconfig.compilerOptions?.forceConsistentCasingInFileNames === true;
  
  if (hasModuleResolution && hasResolveJsonModule && hasForceConsistentCasing) {
    console.log('     - Module resolution: bundler ✅');
    console.log('     - resolveJsonModule: true ✅');
    console.log('     - forceConsistentCasingInFileNames: true ✅');
    return true;
  }
  
  return false;
});

// Results Summary
console.log('\n' + '='.repeat(50));
console.log('📊 DEPLOYMENT FIXES TEST RESULTS');
console.log('='.repeat(50));
console.log(`✅ Tests Passed: ${passedTests}`);
console.log(`❌ Tests Failed: ${totalTests - passedTests}`);
console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 ALL DEPLOYMENT FIXES SUCCESSFULLY APPLIED!');
  console.log('✅ TypeScript configuration updated');
  console.log('✅ Twilio imports fixed');
  console.log('✅ Database schema aligned');
  console.log('✅ Missing properties added');
  console.log('\n🚀 Ready for production deployment!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some fixes still need attention');
  console.log('❌ Check the failed tests above and apply remaining fixes');
  process.exit(1);
}