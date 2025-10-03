/**
 * Direct SQL Import for Lender Products Database
 * Bypasses API and imports directly to database
 */

import fs from 'fs';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function parseLenderProducts(fileContent) {
  const products = [];
  const lines = fileContent.split('\n');
  let currentProduct = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('Product ID:')) {
      if (Object.keys(currentProduct).length > 0) {
        products.push(currentProduct);
      }
      
      const parts = line.split(' - ');
      const lenderName = parts[1] || 'Unknown Lender';
      
      currentProduct = {
        lenderName: lenderName,
        tenantId: '1f58298b-cf64-4883-8eb4-48f958999934'
      };
    }
    else if (line.startsWith('Product Name:')) {
      currentProduct.productName = line.replace('Product Name: ', '');
    }
    else if (line.startsWith('Category:')) {
      const category = line.replace('Category: ', '');
      currentProduct.productType = mapCategory(category);
    }
    else if (line.startsWith('Loan Amount:')) {
      const amounts = line.replace('Loan Amount: ', '');
      const [minAmount, maxAmount] = parseAmountRange(amounts);
      currentProduct.minAmount = minAmount;
      currentProduct.maxAmount = maxAmount;
      currentProduct.minRevenue = minAmount;
    }
    else if (line.startsWith('Interest Rate:')) {
      const rates = line.replace('Interest Rate: ', '');
      const [minRate, maxRate] = parseRateRange(rates);
      currentProduct.minRate = minRate;
      currentProduct.maxRate = maxRate;
    }
    else if (line.startsWith('Country:')) {
      const country = line.replace('Country: ', '');
      currentProduct.geography = country === 'United States' ? 'US' : 
                                country === 'Canada' ? 'CA' : 'INTL';
    }
    else if (line.startsWith('Term:')) {
      const term = line.replace('Term: ', '');
      const [minTerm, maxTerm] = parseTermRange(term);
      currentProduct.termInfo = `${minTerm}-${maxTerm} months`;
    }
    else if (line.startsWith('Documents Required:')) {
      currentProduct.requiredDocuments = line.replace('Documents Required: ', '');
    }
    else if (line.startsWith('Rate Type:')) {
      currentProduct.rateType = line.replace('Rate Type: ', '');
    }
  }
  
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
  return categoryMap[category] || 'term_loan';
}

function parseAmountRange(amountStr) {
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
  const cleanStr = termStr.replace(/months?/g, '').trim();
  const parts = cleanStr.split(' - ');
  
  if (parts.length === 2) {
    return [parseInt(parts[0]), parseInt(parts[1])];
  } else {
    const term = parseInt(parts[0]);
    return [term, term];
  }
}

async function directSqlImport() {
  console.log('🏦 DIRECT SQL LENDER PRODUCTS IMPORT');
  console.log('===================================\n');

  try {
    // Read and parse the lender products file
    console.log('1. Parsing lender products database...');
    const fileContent = fs.readFileSync(
      'attached_assets/Pasted-Complete-Lender-Products-Database-Individual-Product-Details-Product-ID-29-Brookridge-Funding-L-1751088942066_1751088942066.txt', 
      'utf8'
    );
    
    const products = parseLenderProducts(fileContent);
    console.log(`✅ Parsed ${products.length} lender products`);

    // Clear existing products
    console.log('\n2. Clearing existing products...');
    await pool.query("DELETE FROM lenderproducts");
    console.log('✅ Existing products cleared');

    // Import products using direct SQL
    console.log('\n3. Importing products via SQL...');
    let importedCount = 0;

    for (const product of products) {
      try {
        const description = `${product.productType} - Rate: ${product.minRate}% - ${product.maxRate}% | ${product.termInfo} | Docs: ${product.requiredDocuments}`;
        
        await pool.query(`
          INSERT INTO lender_products (
            tenant_id, 
            product_name, 
            lender_name, 
            product_type, 
            geography, 
            min_amount, 
            max_amount, 
            min_revenue, 
            description,
            is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          product.tenantId,
          product.productName,
          product.lenderName,
          product.productType,
          [product.geography],
          product.minAmount.toString(),
          product.maxAmount.toString(),
          product.minRevenue.toString(),
          description,
          true
        ]);
        
        importedCount++;
        if (importedCount % 10 === 0) {
          console.log(`✅ Imported ${importedCount} products...`);
        }
      } catch (error) {
        console.log(`❌ Failed to import ${product.productName}: ${error.message}`);
      }
    }

    console.log('\n🎉 SQL IMPORT COMPLETED');
    console.log('======================');
    console.log(`✅ Successfully imported: ${importedCount} products`);
    console.log(`❌ Failed imports: ${products.length - importedCount} products`);

    // Verify import
    console.log('\n4. Verifying import...');
    const result = await pool.query(
      "SELECT COUNT(*) as count FROM lender_products WHERE tenant_id = '1f58298b-cf64-4883-8eb4-48f958999934'"
    );
    
    console.log(`✅ Database verification: ${result.rows[0].count} products confirmed`);

    // Show sample products
    const sampleResult = await pool.query(
      "SELECT lender_name, product_name, product_type, min_amount, max_amount FROM lender_products WHERE tenant_id = '1f58298b-cf64-4883-8eb4-48f958999934' LIMIT 5"
    );

    console.log('\n📋 Sample imported products:');
    sampleResult.rows.forEach((product, index) => {
      console.log(`${index + 1}. ${product.lender_name} - ${product.product_name}`);
      console.log(`   Type: ${product.product_type} | Amount: $${product.min_amount} - $${product.max_amount}`);
    });

    console.log('\n🏆 LENDER PRODUCTS DATABASE READY');
    console.log('Platform now has comprehensive lender product matching capabilities!');

  } catch (error) {
    console.error('SQL Import error:', error.message);
  } finally {
    await pool.end();
  }
}

directSqlImport().catch(console.error);