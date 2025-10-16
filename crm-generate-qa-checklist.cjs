#!/usr/bin/env node
/**
 * CRM QA Checklist Generator
 * Generates QA markdown checklists for features whose qaChecklistGenerated !== true
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
    
    // Parse the FEATURE_CONTRACTS_PHASE_1 array
    const arrayMatch = content.match(/FEATURE_CONTRACTS_PHASE_1:\s*FeatureContract\[\]\s*=\s*\[([\s\S]*?)\];/);
    if (!arrayMatch) {
      throw new Error('Could not parse FEATURE_CONTRACTS_PHASE_1 array');
    }
    
    // Extract individual feature objects
    const featuresText = arrayMatch[1];
    const features = [];
    
    // Simple regex to extract feature objects
    const featureMatches = featuresText.match(/\{[\s\S]*?\}/g);
    
    if (featureMatches) {
      featureMatches.forEach(match => {
        try {
          // Extract properties using regex
          const feature = match.match(/feature:\s*["']([^"']+)["']/)?.[1];
          const apiEndpoint = match.match(/apiEndpoint:\s*["']([^"']+)["']/)?.[1];
          const hook = match.match(/hook:\s*["']([^"']+)["']/)?.[1];
          const component = match.match(/component:\s*["']([^"']+)["']/)?.[1];
          const buttonOrUI = match.match(/buttonOrUI:\s*["']([^"']+)["']/)?.[1];
          const implemented = match.match(/implemented:\s*(true|false)/)?.[1] === 'true';
          const qaChecklistGenerated = match.match(/qaChecklistGenerated:\s*(true|false)/)?.[1] === 'true';
          
          if (feature && apiEndpoint && hook && component && buttonOrUI) {
            features.push({
              feature,
              apiEndpoint,
              hook,
              component,
              buttonOrUI,
              implemented,
              qaChecklistGenerated: qaChecklistGenerated || false
            });
          }
        } catch (error) {
          log(`Warning: Could not parse feature object: ${match.substring(0, 50)}...`, 'yellow');
        }
      });
    }
    
    return features;
  } catch (error) {
    log(`Error loading feature contracts: ${error.message}`, 'red');
    return [];
  }
}

function generateQAChecklist(feature) {
  const checklist = `# QA Checklist: ${feature.feature}
*Generated: ${new Date().toLocaleDateString()}*

## Feature Contract Validation ✅
- [ ] **API Endpoint**: \`${feature.apiEndpoint}\` responds correctly
- [ ] **React Hook**: \`${feature.hook}\` handles loading/error states
- [ ] **UI Component**: \`${feature.component}\` renders without errors
- [ ] **User Access**: \`${feature.buttonOrUI}\` is visible and clickable

## Functional Testing
- [ ] **Happy Path**: Complete flow works from button click to success
- [ ] **Form Validation**: Required fields show proper error messages
- [ ] **Data Persistence**: Created/updated data appears in database
- [ ] **UI Feedback**: Success/error toasts display correctly
- [ ] **Cache Updates**: React Query cache invalidates properly

## Authentication & Security
- [ ] **Role Protection**: Only authorized roles can access feature
- [ ] **Authentication**: Requires valid JWT token
- [ ] **Tenant Isolation**: Data filtered by tenant ID
- [ ] **Input Validation**: Backend validates all form inputs

## Edge Cases
- [ ] **Network Errors**: Graceful handling of API failures
- [ ] **Slow Connections**: Loading states display appropriately
- [ ] **Invalid Data**: Proper error handling for malformed inputs
- [ ] **Concurrent Updates**: Handles multiple users editing same data

## Browser Compatibility
- [ ] **Chrome**: Feature works in latest Chrome
- [ ] **Firefox**: Feature works in latest Firefox
- [ ] **Safari**: Feature works in latest Safari
- [ ] **Mobile**: Responsive design works on mobile devices

## Performance
- [ ] **Load Time**: Component loads within 2 seconds
- [ ] **API Response**: Backend responds within 500ms
- [ ] **Memory Usage**: No memory leaks detected
- [ ] **Bundle Size**: Component doesn't increase bundle significantly

## Accessibility
- [ ] **Keyboard Navigation**: Fully accessible via keyboard
- [ ] **Screen Reader**: Works with screen reader software
- [ ] **Focus Management**: Proper focus flow in modal/forms
- [ ] **Color Contrast**: Meets WCAG accessibility standards

---

**Test Environment**: Development/Staging
**Tested By**: _[Name]_
**Test Date**: _[Date]_
**Status**: ⏳ Pending / ✅ Passed / ❌ Failed

### Notes:
_[Add any additional notes or issues discovered during testing]_
`;

  return checklist;
}

function updateContractsWithQAFlag(features, processedFeatures) {
  try {
    const contractsPath = path.join(process.cwd(), 'docs/FEATURE_CONTRACTS.ts');
    let content = fs.readFileSync(contractsPath, 'utf8');
    
    // Update the qaChecklistGenerated flag for processed features
    processedFeatures.forEach(feature => {
      const featureRegex = new RegExp(
        `(\\{[^}]*feature:\\s*["']${feature.feature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^}]*)(\\})`,
        'g'
      );
      
      content = content.replace(featureRegex, (match, beforeClosing, closing) => {
        // Add qaChecklistGenerated if it doesn't exist
        if (!beforeClosing.includes('qaChecklistGenerated')) {
          return beforeClosing + ',\n    qaChecklistGenerated: true' + closing;
        } else {
          // Update existing qaChecklistGenerated to true
          return beforeClosing.replace(/qaChecklistGenerated:\s*false/, 'qaChecklistGenerated: true') + closing;
        }
      });
    });
    
    fs.writeFileSync(contractsPath, content);
    log(`✅ Updated FEATURE_CONTRACTS.ts with QA flags`, 'green');
  } catch (error) {
    log(`❌ Failed to update FEATURE_CONTRACTS.ts: ${error.message}`, 'red');
  }
}

function main() {
  log('📋 CRM QA Checklist Generator', 'bold');
  log('==============================', 'blue');
  
  const features = loadFeatureContracts();
  
  if (features.length === 0) {
    log('❌ No feature contracts found', 'red');
    process.exit(1);
  }
  
  // Find features that need QA checklists
  const needsQA = features.filter(f => f.implemented && !f.qaChecklistGenerated);
  
  if (needsQA.length === 0) {
    log('🎉 All implemented features have QA checklists generated!', 'green');
    log('No new QA tasks required.', 'green');
    process.exit(0);
  }
  
  log(`📝 Generating QA checklists for ${needsQA.length} features`, 'blue');
  
  // Create QA directory if it doesn't exist
  const qaDir = path.join(process.cwd(), 'qa-checklists');
  if (!fs.existsSync(qaDir)) {
    fs.mkdirSync(qaDir, { recursive: true });
  }
  
  const processedFeatures = [];
  
  needsQA.forEach(feature => {
    try {
      const checklist = generateQAChecklist(feature);
      const filename = `QA_${feature.feature.replace(/\s+/g, '_').toUpperCase()}.md`;
      const filepath = path.join(qaDir, filename);
      
      fs.writeFileSync(filepath, checklist);
      log(`  ✅ Generated: ${filename}`, 'green');
      processedFeatures.push(feature);
    } catch (error) {
      log(`  ❌ Failed to generate checklist for ${feature.feature}: ${error.message}`, 'red');
    }
  });
  
  // Update contracts to mark QA checklists as generated
  if (processedFeatures.length > 0) {
    updateContractsWithQAFlag(features, processedFeatures);
  }
  
  log('\n📊 Summary:', 'bold');
  log(`✅ Generated ${processedFeatures.length} QA checklists`, 'green');
  log(`📁 Location: ./qa-checklists/`, 'blue');
  log(`🔧 Updated: FEATURE_CONTRACTS.ts`, 'blue');
  
  log('\n📝 Next Steps:', 'yellow');
  log('  1. Review generated QA checklists', 'yellow');
  log('  2. Execute tests according to checklist items', 'yellow');
  log('  3. Update checklist status and notes', 'yellow');
  log('  4. Mark features as QA-approved when complete', 'yellow');
}

// Run generator if called directly
if (require.main === module) {
  main();
}

module.exports = { loadFeatureContracts, generateQAChecklist };