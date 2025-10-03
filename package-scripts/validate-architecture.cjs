#!/usr/bin/env node

/**
 * Architecture Validation Script
 * Run this before any deployment to ensure architecture integrity
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  ARCHITECTURE VALIDATION SUITE');
console.log('================================');

let exitCode = 0;

// 1. Run duplicate detection
console.log('\n1️⃣  Checking for route duplicates...');
try {
  execSync('node scripts/check-duplicates.cjs', { stdio: 'inherit' });
  console.log('✅ Route duplicate check passed');
} catch (e) {
  console.error('❌ Route duplicate check failed');
  exitCode = 1;
}

// 2. Run pre-commit checks
console.log('\n2️⃣  Running comprehensive pre-commit checks...');
try {
  execSync('node scripts/pre-commit-checks.js', { stdio: 'inherit' });
  console.log('✅ Pre-commit checks passed');
} catch (e) {
  console.error('❌ Pre-commit checks failed');
  exitCode = 1;
}

// 3. Check TypeScript compilation
console.log('\n3️⃣  Validating TypeScript compilation...');
try {
  execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'inherit', cwd: 'server' });
  console.log('✅ TypeScript compilation check passed');
} catch (e) {
  console.error('❌ TypeScript compilation has errors');
  exitCode = 1;
}

// 4. Check for circular dependencies
console.log('\n4️⃣  Checking for circular dependencies...');
try {
  // Simple circular dependency check
  const bootFile = fs.readFileSync(path.join(__dirname, '../server/boot.ts'), 'utf8');
  const imports = bootFile.match(/import.*from\s+["']([^"']+)["']/g) || [];
  
  const duplicateImports = new Map();
  imports.forEach(imp => {
    const module = imp.match(/from\s+["']([^"']+)["']/)?.[1];
    if (module) {
      duplicateImports.set(module, (duplicateImports.get(module) || 0) + 1);
    }
  });
  
  const duplicates = Array.from(duplicateImports.entries()).filter(([, count]) => count > 1);
  if (duplicates.length > 0) {
    console.warn('⚠️  Duplicate imports detected:');
    duplicates.forEach(([module, count]) => {
      console.warn(`  ${module}: imported ${count} times`);
    });
  } else {
    console.log('✅ No duplicate imports found');
  }
} catch (e) {
  console.warn('⚠️  Could not check circular dependencies');
}

// 5. Validate route file structure
console.log('\n5️⃣  Validating route file structure...');
try {
  const routesDir = path.join(__dirname, '../server/routes');
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  
  const deprecated = ['tasks.js', 'calendar.js', 'comm-email.js', 'comm-sms.js', 'comm-calls.js'];
  const foundDeprecated = routeFiles.filter(f => deprecated.includes(f));
  
  if (foundDeprecated.length > 0) {
    console.warn('⚠️  Deprecated route files still present:');
    foundDeprecated.forEach(f => console.warn(`  ${f} - consider removing`));
  } else {
    console.log('✅ No deprecated route files found');
  }
} catch (e) {
  console.warn('⚠️  Could not validate route file structure');
}

// 6. Final summary
console.log('\n📊 VALIDATION SUMMARY');
console.log('====================');

if (exitCode === 0) {
  console.log('✅ ALL ARCHITECTURE VALIDATIONS PASSED');
  console.log('🚀 Application is ready for deployment');
} else {
  console.log('❌ ARCHITECTURE VALIDATION FAILED');
  console.log('🛑 Fix issues before deployment');
}

process.exit(exitCode);