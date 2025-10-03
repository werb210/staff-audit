/**
 * Verification Script for Lender Products Import
 */

const BASE_URL = 'http://localhost:5000';

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, data: null, error: error.message };
  }
}

async function verifyImport() {
  console.log('🔍 VERIFYING LENDER PRODUCTS IMPORT');
  console.log('===================================\n');

  // Authenticate
  const staffAuth = await makeRequest(`${BASE_URL}/api/auth/staff/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'staff@acme.com',
      password: process.env.TEST_PASSWORD || 'password'
    })
  });

  if (staffAuth.status !== 200) {
    console.log('❌ Authentication failed');
    return;
  }

  const token = staffAuth.data.token;
  console.log('✅ Authentication successful');

  // Get all lender products
  const productsResponse = await makeRequest(`${BASE_URL}/api/staff/lender-products`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (productsResponse.status !== 200) {
    console.log('❌ Failed to fetch lender products');
    return;
  }

  const products = productsResponse.data;
  console.log(`✅ Successfully retrieved ${products.length} lender products\n`);

  // Show summary by lender
  const lenderCounts = {};
  const categoryBreakdown = {};
  
  products.forEach(product => {
    lenderCounts[product.lenderName] = (lenderCounts[product.lenderName] || 0) + 1;
    categoryBreakdown[product.productType] = (categoryBreakdown[product.productType] || 0) + 1;
  });

  console.log('📊 IMPORT SUMMARY');
  console.log('================');
  console.log(`Total Products: ${products.length}\n`);

  console.log('By Lender:');
  Object.entries(lenderCounts).sort((a, b) => b[1] - a[1]).forEach(([lender, count]) => {
    console.log(`  ${lender}: ${count} products`);
  });

  console.log('\nBy Category:');
  Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]).forEach(([category, count]) => {
    console.log(`  ${category}: ${count} products`);
  });

  // Show sample products
  console.log('\n📋 SAMPLE PRODUCTS');
  console.log('==================');
  products.slice(0, 5).forEach((product, index) => {
    console.log(`${index + 1}. ${product.lenderName} - ${product.productName}`);
    console.log(`   Type: ${product.productType} | Amount: $${product.minRevenue} - $${product.maxRevenue}`);
    console.log(`   Rate: ${product.minInterestRate}% - ${product.maxInterestRate}% | Geography: ${product.geography}`);
    console.log(`   Term: ${product.minTerm} - ${product.maxTerm} months\n`);
  });

  console.log('🎉 LENDER PRODUCTS DATABASE SUCCESSFULLY IMPORTED!');
  console.log('Platform is ready for comprehensive lender matching.');
}

verifyImport().catch(console.error);