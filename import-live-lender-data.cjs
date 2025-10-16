/**
 * Import Live Lender Products Data
 * Processes authentic JSON data and inserts into lenderproducts table
 */

const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');
const fs = require('fs');

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Read the JSON data from the attached file
const rawData = fs.readFileSync('./attached_assets/Pasted--lenderName-Brookridge-Funding-LLV-productName-Purchase-Order-Financing--1751493747270_1751493747272.txt', 'utf8');

// Parse the JSON array
const lenderProducts = JSON.parse(rawData);

async function importLiveData() {
  console.log(`🚀 Starting import of ${lenderProducts.length} live lender products...`);
  
  let imported = 0;
  let errors = 0;
  
  for (const product of lenderProducts) {
    try {
      // Map JSON fields to database schema
      const insertData = {
        lendername: product.lenderName?.trim() || 'Unknown Lender',
        productname: product.productName?.trim() || 'Unknown Product',
        productcategory: product.productCategory || 'Term Loan',
        minamount: product.minAmount || 0,
        maxamount: product.maxAmount || 0,
        minratepct: product.minInterestRate || 0,
        maxratepct: product.maxInterestRate || 0,
        mintermmonths: product.minTermMonths || 12,
        maxtermmonths: product.maxTermMonths || 12,
        ratetype: product.rateType || 'Fixed',
        ratefrequency: product.interestRateFrequency || 'Monthly',
        country: product.country || 'United States',
        minavgmonthlyrevenue: product.minMonthlyRevenue || null,
        mincreditscore: product.minCreditScore || null,
        requireddocuments: product.requiredDocuments || []
      };

      // Insert into database
      await pool.query(`
        INSERT INTO lenderproducts (
          lendername, productname, productcategory, minamount, maxamount,
          minratepct, maxratepct, mintermmonths, maxtermmonths, ratetype,
          ratefrequency, country, minavgmonthlyrevenue, mincreditscore, requireddocuments
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        insertData.lendername,
        insertData.productname,
        insertData.productcategory,
        insertData.minamount,
        insertData.maxamount,
        insertData.minratepct,
        insertData.maxratepct,
        insertData.mintermmonths,
        insertData.maxtermmonths,
        insertData.ratetype,
        insertData.ratefrequency,
        insertData.country,
        insertData.minavgmonthlyrevenue,
        insertData.mincreditscore,
        insertData.requireddocuments
      ]);

      imported++;
      
      if (imported % 10 === 0) {
        console.log(`✅ Imported ${imported} products...`);
      }
      
    } catch (error) {
      errors++;
      console.error(`❌ Error importing product "${product.productName}" from "${product.lenderName}":`, error.message);
    }
  }
  
  console.log(`\n🎯 Import Complete!`);
  console.log(`✅ Successfully imported: ${imported} products`);
  console.log(`❌ Errors: ${errors} products`);
  
  // Verify final count
  const result = await pool.query('SELECT COUNT(*) as total FROM lenderproducts');
  console.log(`📊 Total products in database: ${result.rows[0].total}`);
  
  await pool.end();
}

importLiveData().catch(console.error);