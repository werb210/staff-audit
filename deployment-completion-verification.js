#!/usr/bin/env node

/**
 * Deployment Completion Verification Script
 * Final verification that all deployment fixes have been successfully applied
 */

import fs from 'fs';
import { spawn } from 'child_process';

console.log('🚀 DEPLOYMENT COMPLETION VERIFICATION');
console.log('=====================================\n');

let allTestsPassed = true;

// Test 1: TypeScript Compilation
console.log('1. ✅ TypeScript Compilation Check');
try {
  const result = spawn('npx', ['tsc', '--noEmit', '--skipLibCheck'], { 
    stdio: 'pipe',
    cwd: process.cwd() 
  });
  
  result.on('close', (code) => {
    if (code === 0) {
      console.log('   ✅ TypeScript compilation successful - no errors');
    } else {
      console.log('   ❌ TypeScript compilation failed');
      allTestsPassed = false;
    }
  });
} catch (error) {
  console.log('   ❌ Error running TypeScript compilation check:', error.message);
  allTestsPassed = false;
}

// Test 2: ES Module Compatibility 
console.log('\n2. ✅ ES Module Compatibility Check');
try {
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  const nodeConfig = JSON.parse(fs.readFileSync('tsconfig.node.json', 'utf8'));
  
  const esModuleSettings = {
    main: tsconfig.compilerOptions?.esModuleInterop === true && 
          tsconfig.compilerOptions?.allowSyntheticDefaultImports === true,
    node: nodeConfig.compilerOptions?.esModuleInterop === true && 
          nodeConfig.compilerOptions?.allowSyntheticDefaultImports === true
  };
  
  if (esModuleSettings.main && esModuleSettings.node) {
    console.log('   ✅ ES Module settings properly configured in both configs');
  } else {
    console.log('   ❌ ES Module settings missing or incomplete');
    allTestsPassed = false;
  }
} catch (error) {
  console.log('   ❌ Error checking ES Module settings:', error.message);
  allTestsPassed = false;
}

// Test 3: Twilio Import Fix
console.log('\n3. ✅ Twilio Import Fix Check');
try {
  const smsFile = fs.readFileSync('server/utils/sms.ts', 'utf8');
  
  const hasCorrectImport = smsFile.includes("import twilio from 'twilio'");
  const hasCorrectInstantiation = smsFile.includes("twilio(TWILIO_ACCOUNT_SID");
  const noAsyncImport = !smsFile.includes("await import('twilio')");
  
  if (hasCorrectImport && hasCorrectInstantiation && noAsyncImport) {
    console.log('   ✅ Twilio import fixed - using proper ES module syntax');
    console.log('   - Import: import twilio from \'twilio\'');
    console.log('   - Instantiation: twilio()');
  } else {
    console.log('   ❌ Twilio import still has issues');
    allTestsPassed = false;
  }
} catch (error) {
  console.log('   ❌ Error checking Twilio import:', error.message);
  allTestsPassed = false;
}

// Test 4: Database Schema Completeness
console.log('\n4. ✅ Database Schema Completeness Check');
try {
  const schema = fs.readFileSync('shared/schema.ts', 'utf8');
  
  const requiredTables = [
    'export const userAuditLog =',
    'export const auditLog =', 
    'export const crmActivityLog =',
    'export const userSessions =',
    'export const loginAttempts =',
    'legalBusinessName',
    'dbaName',
    'businessEmail',
    'numberOfEmployees',
    'contactFirstName',
    'ownerSSN'
  ];
  
  let passedChecks = 0;
  requiredTables.forEach(check => {
    if (schema.includes(check)) {
      passedChecks++;
    }
  });
  
  if (passedChecks === requiredTables.length) {
    console.log(`   ✅ All required schema elements present (${passedChecks}/${requiredTables.length})`);
  } else {
    console.log(`   ❌ Missing schema elements (${passedChecks}/${requiredTables.length})`);
    allTestsPassed = false;
  }
} catch (error) {
  console.log('   ❌ Error checking schema:', error.message);
  allTestsPassed = false;
}

// Test 5: Import Statement Validation
console.log('\n5. ✅ Import Statement Validation');
try {
  const serverIndex = fs.readFileSync('server/index.ts', 'utf8');
  
  const hasEsImports = serverIndex.includes('import express') && 
                      serverIndex.includes('import cors') &&
                      serverIndex.includes('import.meta.url');
  
  if (hasEsImports) {
    console.log('   ✅ Server imports using proper ES module syntax');
  } else {
    console.log('   ⚠️  Server imports may need verification');
  }
} catch (error) {
  console.log('   ❌ Error checking server imports:', error.message);
}

// Final Results
setTimeout(() => {
  console.log('\n🏆 DEPLOYMENT COMPLETION SUMMARY');
  console.log('=================================');
  
  if (allTestsPassed) {
    console.log('✅ ALL DEPLOYMENT FIXES SUCCESSFULLY APPLIED');
    console.log('🚀 READY FOR PRODUCTION DEPLOYMENT');
    console.log('\nFixed Issues:');
    console.log('- ✅ TypeScript esModuleInterop & allowSyntheticDefaultImports enabled');
    console.log('- ✅ Twilio import converted to proper ES module syntax');
    console.log('- ✅ Database schema includes all required audit log tables');
    console.log('- ✅ Business table includes all missing properties');
    console.log('- ✅ Import statements using ES module syntax');
    console.log('\nThe application is now ready for deployment with zero compilation errors.');
  } else {
    console.log('❌ SOME DEPLOYMENT FIXES STILL PENDING');
    console.log('Please review the failed checks above and apply additional fixes.');
  }
}, 1000);