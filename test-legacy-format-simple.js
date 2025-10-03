/**
 * Simple test for legacy format field mapping logic
 */

// Sample legacy format data like Todd's
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

// Simulate the generateSmartFields logic with fallbacks
function testFieldMapping(data) {
  return {
    // Company Information - with legacy fallbacks
    legal_business_name: data.step3?.businessName || data.legalName || data.operatingName || "",
    business_entity_type: data.step3?.businessEntity || data.businessStructure || data.businessType || "",
    business_city: data.step1?.city || data.businessCity || "",
    business_state: data.step3?.state || data.businessState || "",
    
    // Principal/Personal Information - with legacy fallbacks
    contact_first_name: data.step4?.firstName || data.applicantFirstName || "",
    contact_last_name: data.step4?.lastName || data.applicantLastName || "",
    contact_email: data.step4?.email || data.applicantEmail || "",
    contact_mobile: data.step4?.phone || data.applicantPhone || "",
    
    // Requested Amount Section - with legacy fallbacks
    requested_amount: data.step1?.requestedAmount || data.fundingAmount || "",
    use_of_funds: data.step1?.lookingFor || data.selectedCategory || data.lookingFor || "",
  };
}

console.log('🧪 TESTING LEGACY FORMAT FIELD MAPPING');
console.log('=====================================');

console.log('\n📊 Input Legacy Data:');
console.log('Business:', legacyData.legalName);
console.log('Contact:', legacyData.applicantFirstName, legacyData.applicantLastName);
console.log('Email:', legacyData.applicantEmail);
console.log('Phone:', legacyData.applicantPhone);
console.log('City:', legacyData.businessCity);
console.log('Amount:', legacyData.fundingAmount);
console.log('Purpose:', legacyData.selectedCategory);

console.log('\n🔄 Processing with fallback logic...');
const mappedFields = testFieldMapping(legacyData);

console.log('\n✅ Mapped Fields Result:');
console.log('=====================================');
Object.entries(mappedFields).forEach(([key, value]) => {
  if (value) {
    console.log(`${key}: "${value}"`);
  }
});

console.log('\n🎯 Verification:');
console.log('=====================================');
console.log(`✓ Business Name: "${mappedFields.legal_business_name}" === "ABC"`);
console.log(`✓ Contact Name: "${mappedFields.contact_first_name} ${mappedFields.contact_last_name}" === "Todd Werboweski"`);
console.log(`✓ Email: "${mappedFields.contact_email}" === "todd@werboweski.com"`);
console.log(`✓ Phone: "${mappedFields.contact_mobile}" === "+15878881837"`);
console.log(`✓ City: "${mappedFields.business_city}" === "Calgary"`);
console.log(`✓ Amount: "${mappedFields.requested_amount}" === "120000"`);
console.log(`✓ Purpose: "${mappedFields.use_of_funds}" === "Business Line of Credit"`);

const success = 
  mappedFields.legal_business_name === "ABC" &&
  mappedFields.contact_first_name === "Todd" &&
  mappedFields.contact_last_name === "Werboweski" &&
  mappedFields.contact_email === "todd@werboweski.com" &&
  mappedFields.contact_mobile === "+15878881837" &&
  mappedFields.business_city === "Calgary" &&
  mappedFields.requested_amount === "120000" &&
  mappedFields.use_of_funds === "Business Line of Credit";

console.log('\n🏁 Test Result:', success ? '✅ PASS - All fields mapped correctly!' : '❌ FAIL - Some fields missing');