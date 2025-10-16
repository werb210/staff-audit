#!/usr/bin/env node

/**
 * 🧪 Direct Test of 27-Field Validation System
 * This script directly imports and tests the field validation utilities
 */

// Import the validation functions
import { 
  allowedFields, 
  logAllowedFields,
  generateCompleteTestData,
  logSmartFieldCount,
  validateFieldCount,
  filterAuthorizedFields
} from './server/utils/smartFieldsValidator.js';

import { generateSmartFields } from './server/signing/generateSmartFields.js';

console.log('🧪 TESTING 27-FIELD VALIDATION SYSTEM DIRECTLY');
console.log('='.repeat(80));

// Step 1: Display allowed fields list
console.log('\n🔍 STEP 1: AUTHORIZED FIELD LIST');
logAllowedFields();

// Step 2: Generate complete test data
console.log('\n🔧 STEP 2: GENERATING COMPLETE TEST DATA');
const testData = generateCompleteTestData();
console.log('Generated test data with keys:', {
  step1: Object.keys(testData.step1),
  step3: Object.keys(testData.step3),
  step4: Object.keys(testData.step4)
});

// Step 3: Generate smart fields from test data
console.log('\n⚡ STEP 3: GENERATING SMART FIELDS');
try {
  const smartFields = generateSmartFields(testData);
  
  // Convert to array format expected by validator
  const fieldsArray = Object.entries(smartFields).map(([name, value]) => ({ name, value }));
  
  // Step 4: Validate field count
  console.log('\n📊 STEP 4: FIELD VALIDATION');
  logSmartFieldCount(fieldsArray);
  validateFieldCount(fieldsArray);
  
  // Step 5: Filter to authorized fields only
  console.log('\n🔍 STEP 5: AUTHORIZED FIELD FILTERING');
  const authorizedFields = filterAuthorizedFields(fieldsArray);
  
  console.log('\n✅ FINAL RESULTS:');
  console.log(`📊 Total fields generated: ${fieldsArray.length}`);
  console.log(`✅ Authorized fields: ${authorizedFields.length}`);
  console.log(`🎯 Expected count: 27`);
  console.log(`📈 Coverage: ${Math.round((authorizedFields.length / 27) * 100)}%`);
  
  if (authorizedFields.length === 27) {
    console.log('\n🎉 SUCCESS: All 27 template fields detected and validated!');
  } else {
    console.log(`\n⚠️  WARNING: Only ${authorizedFields.length}/27 fields detected`);
    
    // Show missing fields
    const fieldNames = authorizedFields.map(f => f.name);
    const missingFields = allowedFields.filter(allowed => !fieldNames.includes(allowed));
    if (missingFields.length > 0) {
      console.log('❌ Missing fields:', missingFields);
    }
  }

} catch (error) {
  console.error('❌ Error during field generation:', error.message);
}

console.log('\n' + '='.repeat(80));
console.log('🧪 27-FIELD VALIDATION TEST COMPLETE');