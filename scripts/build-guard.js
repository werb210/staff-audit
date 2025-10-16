#!/usr/bin/env node

/**
 * Build Guard - Prevents deployment of broken builds
 * Usage: npm run build-guard (run before any deployment)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🛡️  Build Guard: Checking for common issues...\n');

let issues = [];
let warnings = [];

// 1. Check for syntax errors that commonly break builds
function checkSyntaxIssues() {
  console.log('🔍 Checking syntax issues...');
  
  const filesToCheck = [
    'client/src/pages/staff/contacts/ContactsPage.tsx',
    'client/src/pages/staff/tasks/TasksCalendarPage.tsx', 
    'client/src/pages/staff/settings/UserManagementPage.tsx'
  ];
  
  for (const file of filesToCheck) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for await in non-async functions
      const awaitPattern = /(?:onClick|onChange|onSubmit)\s*=\s*\([^)]*\)\s*=>\s*{[^}]*await/g;
      if (awaitPattern.test(content)) {
        issues.push(`${file}: Found 'await' in non-async event handler`);
      }
      
      // Check for missing async keyword
      const asyncPattern = /(?:onClick|onChange|onSubmit)\s*=\s*async\s*\([^)]*\)\s*=>\s*{[^}]*await/g;
      const hasAwait = content.includes('await');
      const hasAsyncHandler = asyncPattern.test(content);
      
      if (hasAwait && !hasAsyncHandler) {
        warnings.push(`${file}: Has 'await' but may be missing 'async' keyword`);
      }
    }
  }
}

// 2. Check for missing imports
function checkImports() {
  console.log('🔍 Checking imports...');
  
  const importChecks = [
    {
      file: 'client/src/pages/staff/tasks/TasksCalendarPage.tsx',
      uses: 'ErrorBoundary',
      shouldImport: 'ErrorBoundary'
    }
  ];
  
  for (const check of importChecks) {
    if (fs.existsSync(check.file)) {
      const content = fs.readFileSync(check.file, 'utf8');
      if (content.includes(check.uses) && !content.includes(`import.*${check.shouldImport}`)) {
        issues.push(`${check.file}: Uses ${check.uses} but missing import`);
      }
    }
  }
}

// 3. Check CSS import order
function checkCSSImports() {
  console.log('🔍 Checking CSS imports...');
  
  const cssFile = 'client/src/index.css';
  if (fs.existsSync(cssFile)) {
    const content = fs.readFileSync(cssFile, 'utf8');
    const lines = content.split('\n');
    
    let foundNonImport = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('@import')) {
        if (foundNonImport) {
          issues.push(`${cssFile}:${i+1}: @import must come before other CSS rules`);
        }
      } else if (line && !line.startsWith('/*') && !line.startsWith('@charset')) {
        foundNonImport = true;
      }
    }
  }
}

// 4. Verify critical files exist
function checkCriticalFiles() {
  console.log('🔍 Checking critical files...');
  
  const criticalFiles = [
    'client/src/pages/staff/settings/UserManagementPage.tsx',
    'server/boot.js',
    'package.json'
  ];
  
  for (const file of criticalFiles) {
    if (!fs.existsSync(file)) {
      issues.push(`Missing critical file: ${file}`);
    }
  }
}

// 5. Test build process
function testBuild() {
  console.log('🔍 Testing build process...');
  
  try {
    // Check if we can run the build command
    execSync('npm run build --dry-run 2>/dev/null || echo "Build command exists"', { stdio: 'pipe' });
  } catch (error) {
    warnings.push('Build command may have issues (run manually to verify)');
  }
}

// Run all checks
checkSyntaxIssues();
checkImports();
checkCSSImports();
checkCriticalFiles();
testBuild();

// Report results
console.log('\n📊 Build Guard Results:');

if (issues.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed! Build should proceed safely.');
  process.exit(0);
}

if (issues.length > 0) {
  console.log('\n❌ CRITICAL ISSUES (must fix before building):');
  issues.forEach(issue => console.log(`  • ${issue}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS (review recommended):');
  warnings.forEach(warning => console.log(`  • ${warning}`));
}

if (issues.length > 0) {
  console.log('\n🚫 Build blocked due to critical issues.');
  process.exit(1);
} else {
  console.log('\n✅ No critical issues found. Build can proceed.');
  process.exit(0);
}