#!/usr/bin/env node
/**
 * CRM Feature Contracts Validation Script
 * Validates that all CRM features are properly registered and implemented
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m', 
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadFeatureContracts() {
  try {
    const contractsPath = path.join(process.cwd(), 'docs/FEATURE_CONTRACTS.ts');
    const content = fs.readFileSync(contractsPath, 'utf8');
    
    // Parse both Phase 1 and Phase 2 contracts
    const phase1Match = content.match(/FEATURE_CONTRACTS_PHASE_1\s*:\s*FeatureContract\[\]\s*=\s*\[([\s\S]*?)\];/);
    const phase2Match = content.match(/FEATURE_CONTRACTS_PHASE_2\s*:\s*FeatureContract\[\]\s*=\s*\[([\s\S]*?)\];/);
    
    if (!phase1Match && !phase2Match) {
      throw new Error('Could not parse FEATURE_CONTRACTS_PHASE_1 or FEATURE_CONTRACTS_PHASE_2 arrays');
    }
    
    // Extract individual feature objects from both phases
    const features = [];
    
    // Process Phase 1 contracts
    if (phase1Match) {
      const phase1Text = phase1Match[1];
      const phase1Matches = phase1Text.match(/\{[\s\S]*?\}/g);
      if (phase1Matches) {
        phase1Matches.forEach(match => processFeatureMatch(match, features, 'Phase 1'));
      }
    }
    
    // Process Phase 2 contracts
    if (phase2Match) {
      const phase2Text = phase2Match[1];
      const phase2Matches = phase2Text.match(/\{[\s\S]*?\}/g);
      if (phase2Matches) {
        phase2Matches.forEach(match => processFeatureMatch(match, features, 'Phase 2'));
      }
    }
    
    return features;
  } catch (error) {
    log(`Error loading feature contracts: ${error.message}`, 'red');
    return [];
  }
}

function processFeatureMatch(match, features, phase) {
  try {
    // Extract properties using regex
    const feature = match.match(/feature:\s*["']([^"']+)["']/)?.[1];
    const apiEndpoint = match.match(/apiEndpoint:\s*["']([^"']+)["']/)?.[1];
    const hook = match.match(/hook:\s*["']([^"']+)["']/)?.[1];
    const component = match.match(/component:\s*["']([^"']+)["']/)?.[1];
    const buttonOrUI = match.match(/buttonOrUI:\s*["']([^"']+)["']/)?.[1];
    const implemented = match.match(/implemented:\s*(true|false)/)?.[1] === 'true';
    
    if (feature && apiEndpoint && hook && component && buttonOrUI) {
      features.push({
        feature,
        apiEndpoint,
        hook,
        component,
        buttonOrUI,
        implemented,
        phase
      });
    }
  } catch (error) {
    log(`Error processing feature match: ${error.message}`, 'yellow');
  }
}

function validateImplementationStatus(features) {
  log('\n🎯 Implementation Status Check', 'blue');
  log('================================', 'blue');
  
  const implemented = features.filter(f => f.implemented);
  const pending = features.filter(f => !f.implemented);
  
  // Group by phase
  const phase1Features = features.filter(f => f.phase === 'Phase 1');
  const phase2Features = features.filter(f => f.phase === 'Phase 2');
  
  const phase1Implemented = phase1Features.filter(f => f.implemented);
  const phase2Implemented = phase2Features.filter(f => f.implemented);
  
  log(`\n📋 Phase 1 CRM Features (${phase1Implemented.length}/${phase1Features.length} implemented):`, 'blue');
  phase1Features.forEach(feature => {
    const status = feature.implemented ? '✅' : '🟡';
    const color = feature.implemented ? 'green' : 'yellow';
    log(`  ${status} ${feature.feature}`, color);
  });
  
  log(`\n📋 Phase 2 Marketing Features (${phase2Implemented.length}/${phase2Features.length} implemented):`, 'blue');
  phase2Features.forEach(feature => {
    const status = feature.implemented ? '✅' : '🟡';
    const color = feature.implemented ? 'green' : 'yellow';
    log(`  ${status} ${feature.feature}`, color);
    if (!feature.implemented) {
      log(`      Component needed: ${feature.component}`, 'yellow');
    }
  });
  
  const completionPercentage = Math.round((implemented.length / features.length) * 100);
  log(`🎯 Overall Completion: ${completionPercentage}%`, completionPercentage === 100 ? 'green' : 'yellow');
  
  return { implemented, pending, completionPercentage };
}

function generateEnforcementReport(features) {
  log('\n📋 Feature Contract Enforcement Report', 'bold');
  log('======================================', 'blue');
  
  log('\n📌 Required Elements for Feature Completion:', 'blue');
  log('  1. API Endpoint - Backend route with authentication', 'blue');
  log('  2. React Hook - TanStack Query hook with error handling', 'blue');
  log('  3. UI Component - Accessible component with validation', 'blue');
  log('  4. Button/Trigger - User can access feature through UI', 'blue');
  log('  5. Contract Registration - implemented: true status', 'blue');
  
  const incompleteImplemented = features.filter(f => f.implemented && f.component.includes('TBD'));
  
  if (incompleteImplemented.length > 0) {
    log('\n⚠️  Warning: Features marked as implemented but have placeholder components:', 'yellow');
    incompleteImplemented.forEach(feature => {
      log(`  • ${feature.feature} - ${feature.component}`, 'yellow');
    });
    log('\n   Action Required: Update implemented status to false until components exist', 'yellow');
  }
  
  return incompleteImplemented.length === 0;
}

function generateNextSteps(features) {
  const pending = features.filter(f => !f.implemented);
  
  if (pending.length === 0) {
    log('\n🎉 All CRM features are complete!', 'green');
    return;
  }
  
  log('\n📝 Next Development Steps:', 'blue');
  log('=========================', 'blue');
  
  pending.forEach((feature, index) => {
    log(`\n${index + 1}. Implement: ${feature.feature}`, 'yellow');
    log(`   Component: ${feature.component}`, 'yellow');
    log(`   Hook: ${feature.hook}`, 'yellow');
    log(`   UI Access: ${feature.buttonOrUI}`, 'yellow');
    
    // Provide specific implementation guidance
    if (feature.component.includes('Company')) {
      log('   📁 Create: apps/staff-portal/src/v2/crm/companies/CompanyModal.tsx', 'blue');
      log('   🔗 Add to: AdminDashboard.tsx companies tab', 'blue');
    } else if (feature.component.includes('Task')) {
      log('   📁 Create: apps/staff-portal/src/v2/crm/tasks/TasksManager.tsx', 'blue');
      log('   🔗 Add to: AdminDashboard.tsx tasks tab', 'blue');
    } else if (feature.component.includes('Deal')) {
      log('   📁 Create: apps/staff-portal/src/v2/crm/deals/DealBoard.tsx', 'blue');
      log('   🔗 Add to: AdminDashboard.tsx deals section', 'blue');
    } else if (feature.component.includes('Activity')) {
      log('   📁 Create: apps/staff-portal/src/v2/crm/activity/ActivityFeed.tsx', 'blue');
      log('   🔗 Add to: AdminDashboard.tsx activity section', 'blue');
    }
  });
  
  log('\n🔄 After Implementation:', 'green');
  log('  1. Update FEATURE_CONTRACTS.ts: implemented: true', 'green');
  log('  2. Run validation: node crm-validate-contracts.cjs', 'green');
  log('  3. Test feature functionality in UI', 'green');
}

function main() {
  log('🔍 CRM Feature Contracts Validation', 'bold');
  log('====================================', 'blue');
  
  const features = loadFeatureContracts();
  
  if (features.length === 0) {
    log('❌ No feature contracts found or failed to parse FEATURE_CONTRACTS.ts', 'red');
    process.exit(1);
  }
  
  log(`📋 Found ${features.length} registered features\n`, 'blue');
  
  // Core validation
  const { implemented, pending, completionPercentage } = validateImplementationStatus(features);
  
  // Enforcement check
  const enforcementValid = generateEnforcementReport(features);
  
  // Development guidance
  generateNextSteps(features);
  
  // Final summary
  log('\n🏁 Validation Summary:', 'bold');
  log(`✅ Implemented: ${implemented.length}/${features.length} features`, 'green');
  log(`🟡 Pending: ${pending.length}/${features.length} features`, pending.length > 0 ? 'yellow' : 'green');
  log(`📊 Completion: ${completionPercentage}%`, completionPercentage === 100 ? 'green' : 'yellow');
  
  if (enforcementValid && completionPercentage === 100) {
    log('\n🎯 Feature Contract System: FULLY COMPLIANT', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Feature Contract System: REQUIRES ATTENTION', 'yellow');
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  main();
}

module.exports = { loadFeatureContracts, validateImplementationStatus, generateEnforcementReport };