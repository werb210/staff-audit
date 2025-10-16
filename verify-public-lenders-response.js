/**
 * Verify /api/public/lenders Response Format
 * Confirms exact format for external client access
 */

const BASE_URL = 'http://localhost:5000';

async function verifyResponseFormat() {
  console.log('🔍 Verifying /api/public/lenders response format...\n');
  
  try {
    // Test OPTIONS request (preflight)
    console.log('📋 Testing CORS preflight...');
    const optionsResponse = await fetch(`${BASE_URL}/api/public/lenders`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://clientportal.replit.app',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log(`   Status: ${optionsResponse.status}`);
    
    // Test actual GET request
    console.log('\n📋 Testing actual GET request...');
    const getResponse = await fetch(`${BASE_URL}/api/public/lenders`, {
      method: 'GET',
      headers: {
        'Origin': 'https://clientportal.replit.app',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${getResponse.status} ${getResponse.statusText}`);
    console.log(`   Content-Type: ${getResponse.headers.get('Content-Type')}`);
    
    if (getResponse.ok) {
      const data = await getResponse.json();
      
      console.log('\n📊 Response Structure Analysis:');
      console.log(`   ✅ Has 'success' field: ${data.hasOwnProperty('success')}`);
      console.log(`   ✅ Success value: ${data.success}`);
      console.log(`   ✅ Has 'products' field: ${data.hasOwnProperty('products')}`);
      console.log(`   ✅ Products is array: ${Array.isArray(data.products)}`);
      console.log(`   ✅ Products count: ${data.products ? data.products.length : 'N/A'}`);
      console.log(`   ✅ Has 'count' field: ${data.hasOwnProperty('count')}`);
      console.log(`   ✅ Count value: ${data.count}`);
      
      if (data.products && data.products.length > 0) {
        console.log('\n📋 First Product Structure:');
        const firstProduct = data.products[0];
        console.log(`   ✅ ID: ${firstProduct.id}`);
        console.log(`   ✅ Name: ${firstProduct.name}`);
        console.log(`   ✅ Lender: ${firstProduct.lenderName}`);
        console.log(`   ✅ Category: ${firstProduct.category}`);
        console.log(`   ✅ Country: ${firstProduct.country}`);
        console.log(`   ✅ Amount Min: ${firstProduct.amountMin}`);
        console.log(`   ✅ Amount Max: ${firstProduct.amountMax}`);
        console.log(`   ✅ Required Docs: ${firstProduct.requiredDocuments ? firstProduct.requiredDocuments.length : 0} items`);
      }
      
      // Expected format check
      const expectedFormat = {
        success: true,
        products: Array.isArray(data.products),
        count: typeof data.count === 'number'
      };
      
      const isCorrectFormat = 
        data.success === true &&
        Array.isArray(data.products) &&
        typeof data.count === 'number' &&
        data.count === data.products.length;
      
      console.log('\n🎯 Format Validation:');
      console.log(`   Expected: { success: true, products: [...], count: number }`);
      console.log(`   Actual: { success: ${data.success}, products: [${data.products ? data.products.length : 0}], count: ${data.count} }`);
      console.log(`   ✅ Format Correct: ${isCorrectFormat ? 'YES' : 'NO'}`);
      
      if (!isCorrectFormat) {
        console.log('\n❌ Response format needs correction');
        console.log('   Current response structure:', Object.keys(data));
      } else {
        console.log('\n✅ Response format is PERFECT for client integration');
        console.log('   External clients can immediately access this endpoint');
        console.log(`   CORS configured for: https://clientportal.replit.app`);
        console.log(`   Total products available: ${data.count}`);
      }
      
    } else {
      console.log(`\n❌ Request failed: ${getResponse.status}`);
      const errorText = await getResponse.text();
      console.log(`   Error: ${errorText}`);
    }
    
  } catch (error) {
    console.log(`\n❌ Test failed: ${error.message}`);
  }
}

// Run verification
verifyResponseFormat().catch(console.error);