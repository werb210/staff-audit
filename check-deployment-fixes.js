#!/usr/bin/env node

/**
 * Check Deployment Fixes Script
 * Verifies that all suggested deployment fixes have been applied correctly
 */

import fs from 'fs';
import path from 'path';

// Test 1: Check TypeScript configuration has esModuleInterop
function checkTypeScriptConfig() {
  console.log('🔍 Checking TypeScript Configuration...');
  
  const configPaths = [
    'tsconfig.json',
    'packages/backend/tsconfig.json'
  ];
  
  let passCount = 0;
  let totalCount = configPaths.length;
  
  configPaths.forEach(configPath => {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(content);
        
        const hasEsModuleInterop = config.compilerOptions?.esModuleInterop === true;
        const hasAllowSyntheticDefaultImports = config.compilerOptions?.allowSyntheticDefaultImports === true;
        
        if (hasEsModuleInterop && hasAllowSyntheticDefaultImports) {
          console.log(`   ✅ ${configPath} - ES Module settings configured correctly`);
          passCount++;
        } else {
          console.log(`   ❌ ${configPath} - Missing ES Module settings:`);
          if (!hasEsModuleInterop) console.log(`      - esModuleInterop: ${config.compilerOptions?.esModuleInterop}`);
          if (!hasAllowSyntheticDefaultImports) console.log(`      - allowSyntheticDefaultImports: ${config.compilerOptions?.allowSyntheticDefaultImports}`);
        }
      } else {
        console.log(`   ⚠️  ${configPath} - File not found`);
      }
    } catch (error) {
      console.log(`   ❌ ${configPath} - Error parsing: ${error.message}`);
    }
  });
  
  return passCount === totalCount;
}

// Test 2: Check Twilio import syntax
function checkTwilioImport() {
  console.log('🔍 Checking Twilio Import Syntax...');
  
  const twilioServicePath = 'server/twilioService.ts';
  
  try {
    if (fs.existsSync(twilioServicePath)) {
      const content = fs.readFileSync(twilioServicePath, 'utf8');
      
      const hasCorrectImport = content.includes("import { Twilio } from 'twilio'");
      const hasCorrectInstantiation = content.includes("new Twilio(");
      const noLegacyImport = !content.includes("import twilio from 'twilio'");
      
      if (hasCorrectImport && hasCorrectInstantiation && noLegacyImport) {
        console.log('   ✅ Twilio import syntax is correct');
        return true;
      } else {
        console.log('   ❌ Twilio import issues:');
        if (!hasCorrectImport) console.log('      - Missing: import { Twilio } from \'twilio\'');
        if (!hasCorrectInstantiation) console.log('      - Missing: new Twilio() instantiation');
        if (!noLegacyImport) console.log('      - Legacy import detected');
        return false;
      }
    } else {
      console.log('   ⚠️  server/twilioService.ts - File not found');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error checking Twilio service: ${error.message}`);
    return false;
  }
}

// Test 3: Check database schema definitions
function checkDatabaseSchema() {
  console.log('🔍 Checking Database Schema Definitions...');
  
  const schemaPath = 'shared/schema.ts';
  
  try {
    if (fs.existsSync(schemaPath)) {
      const content = fs.readFileSync(schemaPath, 'utf8');
      
      const hasUserAuditLog = content.includes('export const userAuditLog =');
      const hasAuditLog = content.includes('export const auditLog =');
      const hasCrmActivityLog = content.includes('export const crmActivityLog =');
      
      // Check for business table fields
      const hasBusinessFields = content.includes('legalBusinessName') && 
                               content.includes('dbaName') && 
                               content.includes('businessEmail') &&
                               content.includes('numberOfEmployees') &&
                               content.includes('contactFirstName') &&
                               content.includes('contactLastName') &&
                               content.includes('ownerSSN');
      
      // Check for user sessions table
      const hasUserSessions = content.includes('export const userSessions =');
      
      // Check for login attempts table with email column
      const hasLoginAttempts = content.includes('export const loginAttempts =') &&
                              content.includes('email: varchar("email"');
      
      let passCount = 0;
      const checks = [
        { name: 'userAuditLog table', passed: hasUserAuditLog },
        { name: 'auditLog table', passed: hasAuditLog },
        { name: 'crmActivityLog table', passed: hasCrmActivityLog },
        { name: 'business table fields', passed: hasBusinessFields },
        { name: 'userSessions table', passed: hasUserSessions },
        { name: 'loginAttempts table with email', passed: hasLoginAttempts }
      ];
      
      checks.forEach(check => {
        if (check.passed) {
          console.log(`   ✅ ${check.name}`);
          passCount++;
        } else {
          console.log(`   ❌ ${check.name} - Missing or incomplete`);
        }
      });
      
      return passCount === checks.length;
    } else {
      console.log('   ❌ shared/schema.ts - File not found');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error checking database schema: ${error.message}`);
    return false;
  }
}

// Test 4: Check for potential module import issues
function checkModuleImports() {
  console.log('🔍 Checking Module Import Patterns...');
  
  const serverFiles = [
    'server/vite.ts',
    'vite.config.ts'
  ];
  
  let passCount = 0;
  
  serverFiles.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for proper ES module imports
        const hasImportMeta = content.includes('import.meta');
        const hasProperImports = content.includes('import ') && !content.includes('require(');
        
        if (hasImportMeta && hasProperImports) {
          console.log(`   ✅ ${filePath} - ES module imports look correct`);
          passCount++;
        } else {
          console.log(`   ⚠️  ${filePath} - Potential import issues`);
          if (!hasImportMeta) console.log(`      - Missing import.meta usage`);
          if (!hasProperImports) console.log(`      - May contain require() calls`);
        }
      } else {
        console.log(`   ⚠️  ${filePath} - File not found`);
      }
    } catch (error) {
      console.log(`   ❌ Error checking ${filePath}: ${error.message}`);
    }
  });
  
  return passCount;
}

// Main execution
async function runDeploymentFixesCheck() {
  console.log('🚀 DEPLOYMENT FIXES VERIFICATION REPORT');
  console.log('='.repeat(50));
  console.log('');
  
  const results = {
    typeScriptConfig: checkTypeScriptConfig(),
    twilioImport: checkTwilioImport(),
    databaseSchema: checkDatabaseSchema(),
    moduleImports: checkModuleImports()
  };
  
  console.log('');
  console.log('📊 SUMMARY:');
  console.log('-'.repeat(30));
  
  const passedTests = Object.values(results).filter(result => result === true).length;
  const totalTests = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
    console.log(`${status} - ${testName}`);
  });
  
  console.log('');
  console.log(`Overall Status: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All deployment fixes have been applied successfully!');
    console.log('✅ Ready for production deployment');
  } else {
    console.log('⚠️  Some deployment fixes still need attention');
    console.log('🔧 Please review the failed tests above');
  }
  
  console.log('');
  return passedTests === totalTests;
}

// Run the check
runDeploymentFixesCheck().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});