/**
 * Automated Feature Completeness Audit
 * Validates CRM features against the Feature Contract System
 */

const fs = require('fs');
const path = require('path');

// Import feature contracts (simulated since we can't import TS directly in Node)
const CRM_FEATURE_CONTRACTS = [
  {
    featureName: 'View Contacts',
    endpoint: '/api/crm/contacts',
    method: 'GET',
    uiComponent: 'ContactsTable.tsx',
    hook: 'useContacts()',
    permissions: ['staff', 'admin'],
    status: 'implemented'
  },
  {
    featureName: 'Create Contact',
    endpoint: '/api/crm/contacts',
    method: 'POST',
    uiComponent: 'ContactModal.tsx',
    hook: 'useCreateContact()',
    permissions: ['staff', 'admin'],
    status: 'implemented'
  },
  {
    featureName: 'Update Contact',
    endpoint: '/api/crm/contacts/:id',
    method: 'PATCH',
    uiComponent: 'ContactModal.tsx',
    hook: 'useUpdateContact()',
    permissions: ['staff', 'admin'],
    status: 'implemented'
  },
  {
    featureName: 'Delete Contact',
    endpoint: '/api/crm/contacts/:id',
    method: 'DELETE',
    uiComponent: 'ContactsTable.tsx',
    hook: 'useDeleteContact()',
    permissions: ['admin'],
    status: 'implemented'
  },
  {
    featureName: 'View Companies',
    endpoint: '/api/crm/companies',
    method: 'GET',
    uiComponent: 'CompaniesTable.tsx',
    hook: 'useCompanies()',
    permissions: ['staff', 'admin'],
    status: 'partial'
  },
  {
    featureName: 'Create Company',
    endpoint: '/api/crm/companies',
    method: 'POST',
    uiComponent: 'CompanyModal.tsx',
    hook: 'useCreateCompany()',
    permissions: ['staff', 'admin'],
    status: 'partial'
  },
  {
    featureName: 'View CRM Deals',
    endpoint: '/api/crm/deals',
    method: 'GET',
    uiComponent: 'DealsBoard.tsx',
    hook: 'useCrmDeals()',
    permissions: ['staff', 'admin'],
    status: 'partial'
  },
  {
    featureName: 'Create CRM Deal',
    endpoint: '/api/crm/deals',
    method: 'POST',
    uiComponent: 'DealModal.tsx',
    hook: 'useCreateCrmDeal()',
    permissions: ['staff', 'admin'],
    status: 'partial'
  },
  {
    featureName: 'View Tasks',
    endpoint: '/api/crm/tasks',
    method: 'GET',
    uiComponent: 'TasksManager.tsx',
    hook: 'useTasks()',
    permissions: ['staff', 'admin'],
    status: 'partial'
  },
  {
    featureName: 'Create Task',
    endpoint: '/api/crm/tasks',
    method: 'POST',
    uiComponent: 'TaskModal.tsx',
    hook: 'useCreateTask()',
    permissions: ['staff', 'admin'],
    status: 'partial'
  },
  {
    featureName: 'View Activity Feed',
    endpoint: '/api/crm/activity',
    method: 'GET',
    uiComponent: 'ActivityFeed.tsx',
    hook: 'useActivityFeed()',
    permissions: ['staff', 'admin'],
    status: 'partial'
  }
];

// File paths for validation
const PATHS = {
  crmRoutes: 'server/routes/crm.ts',
  crmHooks: 'apps/staff-portal/src/v2/hooks/crm.ts',
  crmComponents: 'apps/staff-portal/src/v2/crm/',
  authMiddleware: 'server/enhanced-auth-middleware.ts'
};

// Validation functions
function checkBackendRoute(endpoint, method) {
  try {
    const routesContent = fs.readFileSync(PATHS.crmRoutes, 'utf8');
    // Check for various route patterns
    const patterns = [
      new RegExp(`router\\.${method.toLowerCase()}\\(['"]/api/crm`),
      new RegExp(`app\\.${method.toLowerCase()}\\(['"]/api/crm`),
      new RegExp(`${method.toUpperCase()}.*${endpoint.replace('/api', '')}`)
    ];
    return patterns.some(pattern => pattern.test(routesContent));
  } catch (error) {
    console.log(`Error checking route ${endpoint}:`, error.message);
    return false;
  }
}

function checkReactHook(hookName) {
  try {
    const hooksContent = fs.readFileSync(PATHS.crmHooks, 'utf8');
    const hookPattern = new RegExp(`export\\s+const\\s+${hookName.replace(/[()]/g, '')}`);
    return hookPattern.test(hooksContent);
  } catch (error) {
    return false;
  }
}

function checkUIComponent(componentFile) {
  // Check in multiple possible locations
  const possiblePaths = [
    path.join(PATHS.crmComponents, componentFile),
    path.join(PATHS.crmComponents, 'contacts', componentFile),
    path.join('apps/staff-portal/src/v2/crm/contacts/', componentFile),
    path.join('apps/staff-portal/src/v2/components/', componentFile)
  ];
  
  return possiblePaths.some(p => {
    try {
      return fs.existsSync(p);
    } catch (error) {
      return false;
    }
  });
}

function checkButtonAction(componentFile, featureName) {
  if (!checkUIComponent(componentFile)) return false;
  
  try {
    const componentPath = path.join(PATHS.crmComponents, componentFile);
    const componentContent = fs.readFileSync(componentPath, 'utf8');
    
    // Check for various button patterns
    const buttonPatterns = [
      /onClick/,
      /onSubmit/,
      /<[Bb]utton/,
      /type="submit"/,
      /role="button"/
    ];
    
    return buttonPatterns.some(pattern => pattern.test(componentContent));
  } catch (error) {
    return false;
  }
}

function checkRoleProtection(endpoint) {
  try {
    const routesContent = fs.readFileSync(PATHS.crmRoutes, 'utf8');
    const authContent = fs.readFileSync(PATHS.authMiddleware, 'utf8');
    
    // Check if route uses authentication middleware
    const authPatterns = [
      /authenticate/,
      /requireAuth/,
      /isAuthenticated/,
      /checkRole/
    ];
    
    return authPatterns.some(pattern => 
      pattern.test(routesContent) || pattern.test(authContent)
    );
  } catch (error) {
    return false;
  }
}

// Main audit function
function runFeatureAudit() {
  console.log('\n🔍 CRM Feature Completeness Audit\n');
  console.log('=' * 80);
  
  const results = [];
  let totalScore = 0;
  const maxScore = CRM_FEATURE_CONTRACTS.length * 5; // 5 validation points per feature
  
  // Header
  console.log('Feature'.padEnd(25) + 'API'.padEnd(6) + 'Hook'.padEnd(6) + 'UI'.padEnd(6) + 'Button'.padEnd(8) + 'Protected'.padEnd(10) + 'Status');
  console.log('-'.repeat(80));
  
  CRM_FEATURE_CONTRACTS.forEach(feature => {
    const validation = {
      hasBackendRoute: checkBackendRoute(feature.endpoint, feature.method),
      hasReactHook: checkReactHook(feature.hook),
      hasUIComponent: checkUIComponent(feature.uiComponent),
      hasButtonAction: checkButtonAction(feature.uiComponent, feature.featureName),
      hasRoleProtection: checkRoleProtection(feature.endpoint)
    };
    
    const score = Object.values(validation).filter(Boolean).length;
    totalScore += score;
    
    const statusEmoji = score === 5 ? '✅' : score >= 3 ? '🟡' : '❌';
    
    results.push({
      feature: feature.featureName,
      validation,
      score,
      status: statusEmoji
    });
    
    // Format output row
    const row = [
      feature.featureName.substring(0, 23).padEnd(25),
      (validation.hasBackendRoute ? '✅' : '❌').padEnd(6),
      (validation.hasReactHook ? '✅' : '❌').padEnd(6), 
      (validation.hasUIComponent ? '✅' : '❌').padEnd(6),
      (validation.hasButtonAction ? '✅' : '❌').padEnd(8),
      (validation.hasRoleProtection ? '✅' : '❌').padEnd(10),
      statusEmoji
    ].join('');
    
    console.log(row);
  });
  
  console.log('-'.repeat(80));
  
  // Summary statistics
  const completionPercentage = Math.round((totalScore / maxScore) * 100);
  const fullyImplemented = results.filter(r => r.score === 5).length;
  const partiallyImplemented = results.filter(r => r.score >= 3 && r.score < 5).length;
  const notImplemented = results.filter(r => r.score < 3).length;
  
  console.log('\n📊 Audit Summary:');
  console.log(`Overall Completion: ${completionPercentage}% (${totalScore}/${maxScore} points)`);
  console.log(`✅ Fully Implemented: ${fullyImplemented} features`);
  console.log(`🟡 Partially Implemented: ${partiallyImplemented} features`);
  console.log(`❌ Not Implemented: ${notImplemented} features`);
  
  // Recommendations
  console.log('\n🎯 Next Steps:');
  const incompleteFeatures = results.filter(r => r.score < 5);
  
  if (incompleteFeatures.length === 0) {
    console.log('🎉 All CRM features are fully implemented!');
  } else {
    console.log('Priority fixes needed:');
    incompleteFeatures.slice(0, 3).forEach((result, index) => {
      const missing = Object.entries(result.validation)
        .filter(([_, isValid]) => !isValid)
        .map(([key, _]) => key.replace('has', '').replace(/([A-Z])/g, ' $1').toLowerCase().trim());
      
      console.log(`${index + 1}. ${result.feature}: Missing ${missing.join(', ')}`);
    });
  }
  
  // Generate action items
  console.log('\n🔧 Specific Action Items:');
  const missingComponents = results.filter(r => !r.validation.hasUIComponent);
  const missingButtons = results.filter(r => !r.validation.hasButtonAction);
  
  if (missingComponents.length > 0) {
    console.log(`Create missing UI components: ${missingComponents.map(r => r.feature).join(', ')}`);
  }
  
  if (missingButtons.length > 0) {
    console.log(`Add action buttons to: ${missingButtons.map(r => r.feature).join(', ')}`);
  }
  
  console.log('\n✅ Audit Complete\n');
  
  return {
    results,
    summary: {
      completionPercentage,
      fullyImplemented,
      partiallyImplemented,
      notImplemented,
      totalScore,
      maxScore
    }
  };
}

// Export functions for programmatic use
module.exports = {
  runFeatureAudit,
  checkBackendRoute,
  checkReactHook,
  checkUIComponent,
  checkButtonAction,
  checkRoleProtection
};

// Run audit if called directly
if (require.main === module) {
  runFeatureAudit();
}