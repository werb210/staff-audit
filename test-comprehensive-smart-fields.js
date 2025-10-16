/**
 * Test Comprehensive Smart Fields Generation
 * Verify the new generateSmartFields function works with comprehensive application data
 */

// Test using tsx directly to handle TypeScript imports
async function loadModule() {
  const { generateSmartFields, validateApplicationData, getExpectedFieldCount } = await import('./server/signing/generateSmartFields.ts');
  return { generateSmartFields, validateApplicationData, getExpectedFieldCount };
}

function createTestApplicationData() {
  return {
    id: 'app_test_123456789',
    status: 'submitted',
    createdAt: new Date('2025-07-07'),
    submittedAt: new Date('2025-07-07'),

    // Step 1 - Financial Profile
    financialProfile: {
      businessLocation: 'Toronto, ON',
      headquarters: 'Toronto, ON',
      industry: 'Technology Services',
      lookingFor: 'Working Capital',
      fundingAmount: 250000,
      fundsPurpose: 'Inventory and Equipment Purchase',
      salesHistory: '3 years stable growth',
      revenueLastYear: 850000,
      averageMonthlyRevenue: 70000,
      accountsReceivableBalance: 125000,
      fixedAssetsValue: 150000,
      equipmentValue: 75000
    },

    // Step 2 - Product Selection
    lenderSelection: {
      selectedProductId: 'prod_working_capital_123',
      selectedProductName: 'Working Capital Line of Credit',
      selectedLenderName: 'Quantum LS',
      matchScore: 92,
      selectedCategory: 'line_of_credit',
      selectedCategoryName: 'Line of Credit'
    },

    // Step 3 - Business Details
    businessDetails: {
      operatingName: 'TechFlow Solutions',
      legalName: 'TechFlow Solutions Inc.',
      businessStreetAddress: '123 Bay Street',
      businessCity: 'Toronto',
      businessState: 'ON',
      businessPostalCode: 'M5J 2R8',
      businessPhone: '+1 (416) 555-0123',
      employeeCount: 15,
      businessWebsite: 'www.techflowsolutions.com',
      businessStartDate: '2020-03-15',
      businessStructure: 'Corporation'
    },

    // Step 4 - Applicant Info
    applicantInfo: {
      title: 'CEO',
      firstName: 'Sarah',
      lastName: 'Johnson',
      personalEmail: 'sarah.johnson@techflowsolutions.com',
      personalPhone: '+1 (416) 555-0124',
      dateOfBirth: '1985-06-12',
      socialSecurityNumber: 'XXX-XX-1234',
      ownershipPercentage: 75,
      creditScore: 740,
      personalAnnualIncome: 120000,
      applicantAddress: '456 Queen Street',
      applicantCity: 'Toronto',
      applicantState: 'ON',
      applicantPostalCode: 'M5V 3A8',
      yearsWithBusiness: 5,
      previousLoans: true,
      bankruptcyHistory: false
    },

    // Step 4B - Partner Info (since ownership < 100%)
    partnerInfo: {
      partnerFirstName: 'Michael',
      partnerLastName: 'Chen',
      partnerEmail: 'michael.chen@techflowsolutions.com',
      partnerPhone: '+1 (416) 555-0125',
      partnerDateOfBirth: '1982-09-20',
      partnerSinSsn: 'XXX-XX-5678',
      partnerOwnershipPercentage: 25,
      partnerCreditScore: 720,
      partnerPersonalAnnualIncome: 95000,
      partnerAddress: '789 King Street',
      partnerCity: 'Toronto',
      partnerState: 'ON',
      partnerPostalCode: 'M5H 1J1'
    }
  };
}

async function testComprehensiveSmartFields() {
  console.log('🧪 Testing Comprehensive Smart Fields Generation');
  console.log('================================================');
  
  try {
    // Load the module
    const { generateSmartFields, validateApplicationData, getExpectedFieldCount } = await loadModule();
    
    // 1. Create test data
    console.log('1. 📝 Creating comprehensive test application data...');
    const testApp = createTestApplicationData();
    
    // 2. Validate application data
    console.log('\n2. ✅ Validating application data...');
    const validation = validateApplicationData(testApp);
    
    console.log(`   Valid: ${validation.isValid}`);
    if (validation.missingFields.length > 0) {
      console.log(`   Missing fields: ${validation.missingFields.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.log(`   Warnings: ${validation.warnings.join(', ')}`);
    }
    
    // 3. Generate smart fields
    console.log('\n3. 🧠 Generating smart fields...');
    const smartFields = generateSmartFields(testApp);
    
    console.log(`   Generated ${Object.keys(smartFields).length} smart fields`);
    console.log(`   Expected fields (with partner): ${getExpectedFieldCount(true)}`);
    console.log(`   Expected fields (without partner): ${getExpectedFieldCount(false)}`);
    
    // 4. Analyze field categories
    console.log('\n4. 📊 Smart Field Categories:');
    
    const categories = {
      business: Object.keys(smartFields).filter(k => k.includes('business_') || k.includes('operating_') || k.includes('employee_') || k.includes('headquarters')),
      financial: Object.keys(smartFields).filter(k => k.includes('revenue') || k.includes('funding') || k.includes('assets') || k.includes('balance')),
      contact: Object.keys(smartFields).filter(k => k.includes('contact_') || k.includes('applicant_')),
      partner: Object.keys(smartFields).filter(k => k.includes('partner_')),
      application: Object.keys(smartFields).filter(k => k.includes('application_') || k.includes('selected_') || k.includes('signing_')),
      other: Object.keys(smartFields).filter(k => !k.includes('business_') && !k.includes('revenue') && !k.includes('contact_') && !k.includes('partner_') && !k.includes('application_') && !k.includes('selected_'))
    };
    
    Object.entries(categories).forEach(([category, fields]) => {
      if (fields.length > 0) {
        console.log(`   ${category.toUpperCase()}: ${fields.length} fields`);
        fields.slice(0, 3).forEach(field => console.log(`     • ${field}: ${smartFields[field]}`));
        if (fields.length > 3) console.log(`     ... and ${fields.length - 3} more`);
      }
    });
    
    // 5. Test specific field mappings
    console.log('\n5. 🎯 Key Field Verification:');
    
    const keyChecks = [
      { field: 'business_legal_name', expected: 'TechFlow Solutions Inc.', actual: smartFields.business_legal_name },
      { field: 'contact_first_name', expected: 'Sarah', actual: smartFields.contact_first_name },
      { field: 'funding_amount', expected: 250000, actual: smartFields.funding_amount },
      { field: 'partner_first_name', expected: 'Michael', actual: smartFields.partner_first_name },
      { field: 'selected_lender_name', expected: 'Quantum LS', actual: smartFields.selected_lender_name },
      { field: 'ownership_percentage', expected: 75, actual: smartFields.ownership_percentage }
    ];
    
    keyChecks.forEach(check => {
      const match = check.actual == check.expected;
      console.log(`   ${match ? '✅' : '❌'} ${check.field}: ${check.actual} ${match ? '' : `(expected: ${check.expected})`}`);
    });
    
    // 6. Show sample output for SignNow template setup
    console.log('\n6. 📋 Sample Smart Fields for SignNow Template:');
    console.log('   (First 10 fields)');
    
    Object.entries(smartFields).slice(0, 10).forEach(([name, value]) => {
      console.log(`   ${name}: "${value}"`);
    });
    
    console.log('\n✅ Comprehensive Smart Fields test completed!');
    console.log(`\n📊 SUMMARY:`);
    console.log(`   • Total fields generated: ${Object.keys(smartFields).length}`);
    console.log(`   • Partner fields included: ${Object.keys(smartFields).filter(k => k.includes('partner_')).length > 0 ? 'Yes' : 'No'}`);
    console.log(`   • Data validation: ${validation.isValid ? 'Passed' : 'Failed'}`);
    console.log(`   • Ready for SignNow: ${validation.isValid && Object.keys(smartFields).length > 40 ? 'Yes' : 'Needs review'}`);
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('Stack:', error.stack);
  }
}

// Run the test
testComprehensiveSmartFields().catch(console.error);