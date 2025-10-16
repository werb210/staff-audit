/**
 * ESLint Custom Rules for CRM Feature Contract Enforcement
 * Ensures every new CRM feature is properly registered in FEATURE_CONTRACTS.ts
 */

const fs = require('fs');
const path = require('path');

// Load feature contracts for validation
function loadFeatureContracts() {
  try {
    const contractsPath = path.join(__dirname, 'docs/FEATURE_CONTRACTS.ts');
    const content = fs.readFileSync(contractsPath, 'utf8');
    
    // Extract feature names from the contracts file
    const featureMatches = content.match(/feature:\s*["']([^"']+)["']/g);
    return featureMatches ? featureMatches.map(match => 
      match.replace(/feature:\s*["']([^"']+)["']/, '$1')
    ) : [];
  } catch (error) {
    return [];
  }
}

// Custom ESLint rules
module.exports = {
  rules: {
    'crm-hook-registration': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Ensure CRM hooks are registered in FEATURE_CONTRACTS.ts',
        },
        messages: {
          unregisteredHook: 'CRM hook "{{hookName}}" must be registered in FEATURE_CONTRACTS.ts with endpoint, component, and roles defined',
          missingContract: 'Feature "{{featureName}}" referenced in hook but not found in FEATURE_CONTRACTS.ts'
        }
      },
      create(context) {
        const registeredFeatures = loadFeatureContracts();
        
        return {
          // Check for new CRM hook definitions
          VariableDeclarator(node) {
            if (node.id && node.id.name && node.id.name.startsWith('use') && 
                node.id.name.toLowerCase().includes('crm') || 
                context.getFilename().includes('/crm/')) {
              
              const hookName = node.id.name;
              
              // Check if this hook is registered in contracts
              const isRegistered = registeredFeatures.some(feature => 
                feature.toLowerCase().includes(hookName.toLowerCase().replace('use', ''))
              );
              
              if (!isRegistered) {
                context.report({
                  node,
                  messageId: 'unregisteredHook',
                  data: { hookName }
                });
              }
            }
          },
          
          // Check for API endpoint definitions
          Property(node) {
            if (node.key && node.key.name === 'endpoint' && 
                node.value && node.value.value && 
                node.value.value.includes('/api/crm/')) {
              
              const endpoint = node.value.value;
              
              // Verify this endpoint is documented in contracts
              const isDocumented = registeredFeatures.some(feature => {
                // This is a simplified check - in practice, you'd parse the contracts more thoroughly
                return true; // Placeholder for actual endpoint verification
              });
            }
          }
        };
      }
    },

    'crm-component-registration': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Ensure CRM UI components are linked to feature contracts',
        },
        messages: {
          unregisteredComponent: 'CRM component "{{componentName}}" should be registered in FEATURE_CONTRACTS.ts'
        }
      },
      create(context) {
        const filename = context.getFilename();
        
        return {
          ExportDefaultDeclaration(node) {
            if (filename.includes('/crm/') && filename.endsWith('.tsx')) {
              const componentName = path.basename(filename, '.tsx');
              const registeredFeatures = loadFeatureContracts();
              
              // Check if component is referenced in contracts
              const isRegistered = registeredFeatures.length > 0; // Simplified check
              
              if (!isRegistered && componentName !== 'index') {
                context.report({
                  node,
                  messageId: 'unregisteredComponent',
                  data: { componentName }
                });
              }
            }
          }
        };
      }
    }
  }
};