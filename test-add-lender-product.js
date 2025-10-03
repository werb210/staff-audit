/**
 * Test script to verify "Add New Lender Product" functionality
 * Tests all fields including requiredDocuments array
 */

const axios = require('axios');

async function testAddLenderProduct() {
  console.log('🧪 Testing Add New Lender Product with all fields...');
  
  const testProduct = {
    name: "Test Equipment Loan", // Backend expects 'name'
    lenderName: "Test Lender Inc",
    category: "Equipment Financing", // Backend expects 'category'
    country: "US",
    minAmount: 50000,
    maxAmount: 500000,
    minRevenue: 250000, // Required field
    interestRateMin: 4.99,
    interestRateMax: 12.99,
    termMin: 12,
    termMax: 60,
    rateType: "Fixed",
    rateFrequency: "Monthly", 
    description: "Test equipment financing product with comprehensive fields",
    docRequirements: [
      "Bank Statements",
      "Tax Returns", 
      "Equipment Quote/Invoice",
      "Financial Statements"
    ]
  };

  try {
    console.log('📤 Sending test product creation request...');
    
    // Test product creation
    const response = await axios.post('http://localhost:5000/api/rbac/lender-products', testProduct, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'auth_token=test' // Mock auth for test
      },
      withCredentials: true
    });
    
    console.log('✅ Product creation response:', response.status);
    
    // Verify the product appears in public API
    const publicResponse = await axios.get('http://localhost:5000/api/public/lenders');
    const products = publicResponse.data.products || publicResponse.data;
    
    const testProductResult = products.find(p => 
      (p.name || p.product_name) === "Test Equipment Loan"
    );
    
    if (testProductResult) {
      console.log('🎉 SUCCESS: Test product found in public API');
      console.log('📋 Verifying all fields present:');
      
      const checks = [
        { field: 'name/product_name', value: testProductResult.name || testProductResult.product_name },
        { field: 'lender_name', value: testProductResult.lender_name },
        { field: 'category', value: testProductResult.category },
        { field: 'country', value: testProductResult.country },
        { field: 'min_amount', value: testProductResult.min_amount },
        { field: 'max_amount', value: testProductResult.max_amount },
        { field: 'interest_rate_min', value: testProductResult.interest_rate_min },
        { field: 'interest_rate_max', value: testProductResult.interest_rate_max },
        { field: 'term_min', value: testProductResult.term_min },
        { field: 'term_max', value: testProductResult.term_max },
        { field: 'rate_type', value: testProductResult.rate_type },
        { field: 'rate_frequency', value: testProductResult.rate_frequency },
        { field: 'doc_requirements', value: testProductResult.doc_requirements, isArray: true },
        { field: 'description', value: testProductResult.description }
      ];
      
      let passCount = 0;
      checks.forEach(check => {
        const status = check.value !== null && check.value !== undefined ? '✅' : '❌';
        if (check.isArray) {
          const arrayStatus = Array.isArray(check.value) && check.value.length > 0 ? '✅' : '❌';
          console.log(`${arrayStatus} ${check.field}: ${JSON.stringify(check.value)}`);
          if (arrayStatus === '✅') passCount++;
        } else {
          console.log(`${status} ${check.field}: ${check.value}`);
          if (status === '✅') passCount++;
        }
      });
      
      console.log(`\n📊 Field Verification: ${passCount}/${checks.length} fields present`);
      
      if (passCount === checks.length) {
        console.log('🎯 ALL REQUIRED FIELDS PRESENT - Schema compliance verified!');
      } else {
        console.log('⚠️  Some fields missing - check schema alignment');
      }
      
    } else {
      console.log('❌ Test product not found in public API response');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.status, error.response?.data || error.message);
  }
}

testAddLenderProduct();
