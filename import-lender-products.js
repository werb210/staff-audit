/**
 * Lender Products Database Import Script
 * Parses and imports complete lender products database into the platform
 */

import fs from 'fs';

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

function parseLenderProducts(fileContent) {
  const products = [];
  const lines = fileContent.split('\n');
  let currentProduct = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('Product ID:')) {
      // Save previous product if exists
      if (Object.keys(currentProduct).length > 0) {
        products.push(currentProduct);
      }
      
      // Start new product
      const parts = line.split(' - ');
      const productId = parts[0].replace('Product ID: ', '');
      const lenderName = parts[1] || 'Unknown Lender';
      
      currentProduct = {
        lenderName: lenderName,
        tenantId: '1f58298b-cf64-4883-8eb4-48f958999934' // Acme Financial Services
      };
    }
    else if (line.startsWith('Product Name:')) {
      currentProduct.productName = line.replace('Product Name: ', '');
    }
    else if (line.startsWith('Category:')) {
      const category = line.replace('Category: ', '');
      currentProduct.productType = mapCategory(category);
      currentProduct.loanCategory = mapLoanCategory(category);
    }
    else if (line.startsWith('Loan Amount:')) {
      const amounts = line.replace('Loan Amount: ', '');
      const [minAmount, maxAmount] = parseAmountRange(amounts);
      currentProduct.minRevenue = minAmount;
      currentProduct.maxRevenue = maxAmount;
    }
    else if (line.startsWith('Interest Rate:')) {
      const rates = line.replace('Interest Rate: ', '');
      const [minRate, maxRate] = parseRateRange(rates);
      currentProduct.minInterestRate = minRate;
      currentProduct.maxInterestRate = maxRate;
    }
    else if (line.startsWith('Rate Type:')) {
      currentProduct.rateType = line.replace('Rate Type: ', '');
    }
    else if (line.startsWith('Country:')) {
      const country = line.replace('Country: ', '');
      currentProduct.geography = country === 'United States' ? 'US' : 
                                country === 'Canada' ? 'CA' : 'INTL';
    }
    else if (line.startsWith('Term:')) {
      const term = line.replace('Term: ', '');
      const [minTerm, maxTerm] = parseTermRange(term);
      currentProduct.minTerm = minTerm;
      currentProduct.maxTerm = maxTerm;
    }
    else if (line.startsWith('Documents Required:')) {
      currentProduct.requiredDocuments = line.replace('Documents Required: ', '');
    }
    else if (line.startsWith('Rate Frequency:')) {
      currentProduct.rateFrequency = line.replace('Rate Frequency: ', '');
    }
    else if (line.startsWith('Status:')) {
      currentProduct.status = line.replace('Status: ', '').toLowerCase();
    }
  }
  
  // Add the last product
  if (Object.keys(currentProduct).length > 0) {
    products.push(currentProduct);
  }
  
  return products;
}

function mapCategory(category) {
  const categoryMap = {
    'Purchase Order Financing': 'purchase_order_financing',
    'Business Line of Credit': 'line_of_credit',
    'Invoice Factoring': 'invoice_factoring',
    'Equipment Financing': 'equipment_financing',
    'Term Loan': 'term_loan',
    'Working Capital': 'working_capital'
  };
  return categoryMap[category] || 'other';
}

function mapLoanCategory(category) {
  const loanCategoryMap = {
    'Purchase Order Financing': 'working_capital',
    'Business Line of Credit': 'working_capital',
    'Invoice Factoring': 'working_capital',
    'Equipment Financing': 'equipment',
    'Term Loan': 'working_capital',
    'Working Capital': 'working_capital'
  };
  return loanCategoryMap[category] || 'working_capital';
}

function parseAmountRange(amountStr) {
  // Handle formats like "$50,000 - $30,000,000"
  const cleanStr = amountStr.replace(/\$|,/g, '');
  const parts = cleanStr.split(' - ');
  
  if (parts.length === 2) {
    return [parseInt(parts[0]), parseInt(parts[1])];
  } else {
    const amount = parseInt(parts[0]);
    return [amount, amount];
  }
}

function parseRateRange(rateStr) {
  // Handle formats like "2.5% - 3%" or "16.99% - 35.99%"
  const cleanStr = rateStr.replace(/%/g, '');
  const parts = cleanStr.split(' - ');
  
  if (parts.length === 2) {
    return [parseFloat(parts[0]), parseFloat(parts[1])];
  } else {
    const rate = parseFloat(parts[0]);
    return [rate, rate];
  }
}

function parseTermRange(termStr) {
  // Handle formats like "12 months", "12 - 72 months", "6 - 24 months"
  const cleanStr = termStr.replace(/months?/g, '').trim();
  const parts = cleanStr.split(' - ');
  
  if (parts.length === 2) {
    return [parseInt(parts[0]), parseInt(parts[1])];
  } else {
    const term = parseInt(parts[0]);
    return [term, term];
  }
}

async function importLenderProducts() {
  console.log('🏦 LENDER PRODUCTS DATABASE IMPORT');
  console.log('==================================\n');

  try {
    // Get staff authentication
    console.log('1. Authenticating as staff...');
    const staffAuth = await makeRequest(`${BASE_URL}/api/auth/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staff@acme.com',
        password: process.env.TEST_PASSWORD || 'password'
      })
    });

    if (staffAuth.status !== 200 || !staffAuth.data?.token) {
      console.log('❌ Staff authentication failed');
      return;
    }

    const adminToken = staffAuth.data.token;
    console.log('✅ Staff authentication successful');

    // Read and parse the lender products file
    console.log('\n2. Parsing lender products database...');
    const fileContent = fs.readFileSync(
      'attached_assets/Pasted-Complete-Lender-Products-Database-Individual-Product-Details-Product-ID-29-Brookridge-Funding-L-1751088942066_1751088942066.txt', 
      'utf8'
    );
    
    const products = parseLenderProducts(fileContent);
    console.log(`✅ Parsed ${products.length} lender products`);

    // Clear existing test products (optional)
    console.log('\n3. Clearing existing test products...');
    const clearResponse = await makeRequest(`${BASE_URL}/api/admin/lender-products/clear`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (clearResponse.status === 200) {
      console.log('✅ Existing products cleared');
    } else {
      console.log('⚠️ Could not clear existing products (may not exist)');
    }

    // Import products in batches
    console.log('\n4. Importing lender products...');
    let importedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      const importResponse = await makeRequest(`${BASE_URL}/api/admin/lender-products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lenderName: product.lenderName,
          productName: product.productName,
          productType: product.productType,
          geography: [product.geography || 'US'],
          minAmount: product.minRevenue?.toString() || '0',
          maxAmount: product.maxRevenue?.toString() || '999999999',
          minRevenue: product.minRevenue?.toString() || '0',
          description: `${product.productType} - Interest Rate: ${product.minInterestRate}% - ${product.maxInterestRate}% | Term: ${product.minTerm} - ${product.maxTerm} months | ${product.requiredDocuments}`,
          isActive: true,
          tenantId: product.tenantId
        })
      });

      if (importResponse.status === 200 || importResponse.status === 201) {
        importedCount++;
        if (i % 10 === 0) {
          console.log(`✅ Imported ${importedCount} products...`);
        }
      } else {
        errorCount++;
        console.log(`❌ Failed to import product ${product.id}: ${importResponse.data?.message || 'Unknown error'}`);
      }
    }

    console.log('\n🎉 IMPORT COMPLETED');
    console.log('==================');
    console.log(`✅ Successfully imported: ${importedCount} products`);
    console.log(`❌ Failed imports: ${errorCount} products`);
    console.log(`📊 Total processed: ${products.length} products`);

    // Verify import
    console.log('\n5. Verifying imported products...');
    const verifyResponse = await makeRequest(`${BASE_URL}/api/staff/lender-products`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (verifyResponse.status === 200) {
      console.log(`✅ Verification successful: ${verifyResponse.data.length} products in database`);
      
      // Show sample of imported products
      const sampleProducts = verifyResponse.data.slice(0, 5);
      console.log('\n📋 Sample imported products:');
      sampleProducts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.lenderName} - ${product.productName}`);
        console.log(`   Type: ${product.productType} | Amount: $${product.minRevenue} - $${product.maxRevenue}`);
        console.log(`   Rate: ${product.minInterestRate}% - ${product.maxInterestRate}% | Geography: ${product.geography}`);
      });
    } else {
      console.log('❌ Verification failed');
    }

    console.log('\n🏆 LENDER PRODUCTS DATABASE READY');
    console.log('Platform now has comprehensive lender product matching capabilities!');

  } catch (error) {
    console.error('Import process error:', error.message);
  }
}

// Run the import
importLenderProducts().catch(console.error);