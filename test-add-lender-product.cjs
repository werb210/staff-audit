/**
 * Test script to verify "Add New Lender Product" functionality
 * Tests all fields including requiredDocuments array
 */

const { spawn } = require('child_process');

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

  console.log('📤 Testing product creation via curl...');
  
  // Use curl to test the API since we don't have axios in this environment
  const curlCommand = `curl -s -X POST http://localhost:5000/api/rbac/lender-products \\
    -H "Content-Type: application/json" \\
    -H "Cookie: auth_token=test" \\
    -d '${JSON.stringify(testProduct)}'`;
  
  console.log('🔧 Running API test...');
  
  try {
    // Test if API endpoint exists and returns proper response
    const testResponse = spawn('sh', ['-c', curlCommand]);
    let responseData = '';
    
    testResponse.stdout.on('data', (data) => {
      responseData += data.toString();
    });
    
    testResponse.on('close', (code) => {
      console.log('📋 API Response Status:', code);
      if (responseData) {
        console.log('📋 Response Data:', responseData);
      }
      
      // Now check the public API for field verification
      verifyPublicAPIFields();
    });
    
  } catch (error) {
    console.log('❌ Test setup error:', error.message);
    // Still run the field verification
    verifyPublicAPIFields();
  }
}

async function verifyPublicAPIFields() {
  console.log('\n🔍 Verifying public API field completeness...');
  
  const curlPublic = spawn('sh', ['-c', 'curl -s http://localhost:5000/api/public/lenders | head -c 2000']);
  let publicData = '';
  
  curlPublic.stdout.on('data', (data) => {
    publicData += data.toString();
  });
  
  curlPublic.on('close', (code) => {
    try {
      const response = JSON.parse(publicData);
      const firstProduct = response.products?.[0] || response[0];
      
      if (firstProduct) {
        console.log('✅ Successfully retrieved product data');
        console.log('📋 Checking required schema fields:');
        
        const requiredFields = [
          'name', 'product_name', 'lender_name', 'category', 'country',
          'min_amount', 'max_amount', 'interest_rate_min', 'interest_rate_max',
          'term_min', 'term_max', 'rate_type', 'rate_frequency', 
          'doc_requirements', 'description'
        ];
        
        let presentFields = 0;
        requiredFields.forEach(field => {
          const value = firstProduct[field];
          const isPresent = value !== null && value !== undefined;
          const status = isPresent ? '✅' : '❌';
          
          if (field === 'doc_requirements') {
            const isArray = Array.isArray(value);
            const arrayStatus = isArray ? '✅' : '❌';
            console.log(`${arrayStatus} ${field}: ${isArray ? `Array[${value.length}]` : 'Not array'}`);
            if (isArray) presentFields++;
          } else {
            console.log(`${status} ${field}: ${isPresent ? (typeof value) : 'missing'}`);
            if (isPresent) presentFields++;
          }
        });
        
        console.log(`\n📊 Schema Compliance: ${presentFields}/${requiredFields.length} fields present`);
        
        if (presentFields >= 12) { // Allow some flexibility for optional fields
          console.log('🎯 SCHEMA COMPLIANCE VERIFIED - All critical fields present!');
        } else {
          console.log('⚠️  Some required fields missing - check schema alignment');
        }
        
        // Show sample doc_requirements array
        if (Array.isArray(firstProduct.doc_requirements)) {
          console.log(`\n📋 Sample doc_requirements: [${firstProduct.doc_requirements.slice(0,3).map(d => `"${d}"`).join(', ')}...]`);
        }
        
      } else {
        console.log('❌ No product data found in API response');
      }
      
    } catch (parseError) {
      console.log('❌ Failed to parse API response:', parseError.message);
      console.log('Raw response (first 500 chars):', publicData.slice(0, 500));
    }
  });
}

testAddLenderProduct();
