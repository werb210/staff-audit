/**
 * Test script to verify generateSmartFields works with legacy flat format data
 */

import { generateSmartFields } from './server/signing/generateSmartFields.ts';

// Sample legacy format data like yours
const legacyData = {
  legalName: "ABC",
  operatingName: "ABC", 
  businessStructure: "LLC",
  businessCity: "Calgary",
  businessState: "AB",
  businessAddress: "123 Main St",
  businessZipCode: "T2P 1J9",
  applicantFirstName: "Todd",
  applicantLastName: "Werboweski",
  applicantEmail: "todd@werboweski.com",
  applicantPhone: "+15878881837",
  applicantAddress: "456 Personal Ave",
  applicantCity: "Calgary",
  applicantState: "AB",
  applicantZipCode: "T2P 2K1",
  fundingAmount: "120000",
  selectedCategory: "Business Line of Credit",
  lookingFor: "Working Capital",
  averageMonthlyRevenue: "50000",
  salesHistory: "3 years"
};

console.log('🧪 TESTING LEGACY FORMAT SUPPORT');
console.log('=====================================');

console.log('\n📊 Input Legacy Data:');
console.log(JSON.stringify(legacyData, null, 2));

console.log('\n🔄 Processing with generateSmartFields...');
const smartFields = generateSmartFields(legacyData);

console.log('\n✅ Generated Smart Fields:');
console.log('=====================================');
Object.entries(smartFields).forEach(([key, value]) => {
  if (value) {
    console.log(`${key}: "${value}"`);
  }
});

console.log('\n🎯 Key Field Verification:');
console.log('=====================================');
console.log(`Business Name: "${smartFields.legal_business_name}" (expected: "ABC")`);
console.log(`Contact Name: "${smartFields.contact_first_name} ${smartFields.contact_last_name}" (expected: "Todd Werboweski")`);
console.log(`Email: "${smartFields.contact_email}" (expected: "todd@werboweski.com")`);
console.log(`Phone: "${smartFields.contact_mobile}" (expected: "+15878881837")`);
console.log(`City: "${smartFields.business_city}" (expected: "Calgary")`);
console.log(`Amount: "${smartFields.requested_amount}" (expected: "120000")`);
console.log(`Purpose: "${smartFields.use_of_funds}" (expected: "Business Line of Credit")`);

console.log('\n🏁 Test Complete');