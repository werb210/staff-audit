/**
 * Import Authentic 40+ Lender Products from Database File
 * Parses and imports complete authentic lender products database
 */

import fs from 'fs';
import { db } from './server/db.ts';
import { lenderProducts } from './shared/schema.ts';

function mapCategoryToEnum(category) {
  const mapping = {
    'Purchase Order Financing': 'invoice_factoring', // Best match for PO financing
    'Business Line of Credit': 'line_of_credit',
    'Invoice Factoring': 'invoice_factoring',
    'Equipment Financing': 'equipment_financing',
    'Term Loan': 'term_loan',
    'Working Capital': 'line_of_credit'
  };
  return mapping[category] || 'line_of_credit';
}

function mapCountryToEnum(country) {
  const mapping = {
    'United States': 'US',
    'Canada': 'CA',
    'US': 'US',
    'CA': 'CA'
  };
  return mapping[country] || 'US';
}

function parseAmount(amountStr) {
  if (!amountStr) return [0, 0];
  
  const cleanStr = amountStr.replace(/[$,]/g, '');
  const parts = cleanStr.split(' - ');
  
  if (parts.length === 2) {
    return [parseInt(parts[0]), parseInt(parts[1])];
  } else {
    const amount = parseInt(parts[0]);
    return [amount, amount];
  }
}

function parseProducts(fileContent) {
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
      const lenderName = parts[1] || 'Unknown Lender';
      
      currentProduct = {
        lenderName: lenderName.trim(),
        tenantId: '00000000-0000-0000-0000-000000000000'
      };
    }
    else if (line.startsWith('Product Name:')) {
      currentProduct.productName = line.replace('Product Name: ', '').trim();
      currentProduct.name = currentProduct.productName; // Required field
    }
    else if (line.startsWith('Category:')) {
      const category = line.replace('Category: ', '').trim();
      currentProduct.category = mapCategoryToEnum(category);
    }
    else if (line.startsWith('Loan Amount:')) {
      const amountStr = line.replace('Loan Amount: ', '').trim();
      const [minAmount, maxAmount] = parseAmount(amountStr);
      currentProduct.minAmount = minAmount;
      currentProduct.maxAmount = maxAmount;
      // Set reasonable revenue requirements (typically 2-3x loan amount)
      currentProduct.minRevenue = Math.max(minAmount * 2, 50000);
    }
    else if (line.startsWith('Country:')) {
      const country = line.replace('Country: ', '').trim();
      currentProduct.country = mapCountryToEnum(country);
      currentProduct.geography = [mapCountryToEnum(country)];
    }
    else if (line.startsWith('Documents Required:')) {
      const docsStr = line.replace('Documents Required: ', '').trim();
      const docList = docsStr.split(', ').map(doc => {
        // Map common document types to our enum values
        const mapping = {
          'Bank Statements': 'bank_statements',
          'Accountant Prepared Financials': 'financial_statements',
          'Articles of Incorporation': 'articles_of_incorporation',
          'Balance Sheet': 'financial_statements',
          'Profit and Loss Statement': 'financial_statements',
          'Purchase order/Invoice of equipment to be financed': 'equipment_quote',
          'Personal Financial Statement': 'personal_guarantee',
          'Income Statement': 'financial_statements'
        };
        return mapping[doc] || 'business_license';
      });
      currentProduct.docRequirements = [...new Set(docList)]; // Remove duplicates
    }
  }
  
  // Don't forget the last product
  if (Object.keys(currentProduct).length > 0) {
    products.push(currentProduct);
  }
  
  return products;
}

async function importAuthentic() {
  console.log('🏦 IMPORTING AUTHENTIC 40+ LENDER PRODUCTS');
  console.log('=========================================\n');

  try {
    // Read the authentic lender products file
    console.log('1. Reading authentic lender products database...');
    const fileContent = fs.readFileSync(
      'attached_assets/Pasted-Complete-Lender-Products-Database-Individual-Product-Details-Product-ID-29-Brookridge-Funding-L-1751088942066_1751088942066.txt', 
      'utf8'
    );
    
    // Parse all products
    const products = parseProducts(fileContent);
    console.log(`✅ Parsed ${products.length} authentic lender products\n`);

    // Clear existing products
    console.log('2. Clearing existing products...');
    await db.delete(lenderProducts);
    console.log('✅ Existing products cleared\n');

    // Import products
    console.log('3. Importing authentic products...');
    let importedCount = 0;
    
    for (const product of products) {
      try {
        // Ensure all required fields are present
        if (!product.name || !product.category || !product.country) {
          console.log(`⚠️ Skipping incomplete product: ${product.productName || 'Unknown'}`);
          continue;
        }
        
        await db.insert(lenderProducts).values({
          id: crypto.randomUUID(),
          name: product.name,
          country: product.country,
          category: product.category,
          minAmount: product.minAmount || 10000,
          maxAmount: product.maxAmount || 1000000,
          minRevenue: product.minRevenue || 50000,
          docRequirements: product.docRequirements || ['bank_statements', 'business_license'],
          tenantId: product.tenantId,
          productName: product.productName,
          lenderName: product.lenderName,
          geography: product.geography || ['US'],
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        importedCount++;
        console.log(`✅ Imported: ${product.lenderName} - ${product.productName}`);
        
      } catch (error) {
        console.log(`❌ Failed to import ${product.productName}: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 IMPORT COMPLETED`);
    console.log(`✅ Successfully imported: ${importedCount} authentic lender products`);
    
    // Verify the import
    const verification = await db.select().from(lenderProducts);
    console.log(`✅ Database verification: ${verification.length} products confirmed\n`);
    
    // Show category breakdown
    const categories = {};
    verification.forEach(p => {
      categories[p.category] = (categories[p.category] || 0) + 1;
    });
    
    console.log('📊 CATEGORY BREAKDOWN:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} products`);
    });
    
    console.log('\n🏆 AUTHENTIC LENDER PRODUCTS DATABASE READY');
    console.log('Platform now has comprehensive authentic lender product matching capabilities!');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
importAuthentic();