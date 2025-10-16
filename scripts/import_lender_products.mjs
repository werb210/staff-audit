import fs from 'node:fs';
import pg from 'pg';

console.log('🚀 Starting lender products import...');

// Read the migration data
const data = JSON.parse(fs.readFileSync('staff_lender_products_data.json', 'utf8'));
console.log(`📊 Found ${data.products.length} products to import`);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  console.log('✅ Connected to database');
  
  await client.query('BEGIN');
  console.log('🔄 Starting transaction...');

  // Clear existing lender products
  await client.query('TRUNCATE TABLE lender_products RESTART IDENTITY CASCADE');
  console.log('🗑️ Cleared existing lender_products');

  let importedCount = 0;
  let skippedCount = 0;

  for (const product of data.products) {
    try {
      // Find or create lender
      let lenderResult = await client.query(
        'SELECT id FROM lenders WHERE LOWER(name) = LOWER($1) LIMIT 1', 
        [product.lenderName]
      );
      
      let lenderId;
      if (lenderResult.rows.length === 0) {
        // Create new lender if it doesn't exist
        const newLenderResult = await client.query(
          'INSERT INTO lenders (name, country, tenant, is_active, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
          [product.lenderName, product.countryOffered || 'US', 'bf', true]
        );
        lenderId = newLenderResult.rows[0].id;
        console.log(`➕ Created new lender: ${product.lenderName}`);
      } else {
        lenderId = lenderResult.rows[0].id;
      }

      // Insert lender product - using actual schema column names
      await client.query(`
        INSERT INTO lender_products (
          lender_id, external_id, product_name, product_category,
          minimum_lending_amount, maximum_lending_amount,
          interest_rate_minimum, interest_rate_maximum,
          term_minimum, term_maximum, country_offered,
          is_active, documents_required, description,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      `, [
        lenderId,                           // lender_id
        product.externalId || null,         // external_id  
        product.productName,                // product_name
        product.productCategory || null,    // product_category
        product.minimumLendingAmount || 0,  // minimum_lending_amount
        product.maximumLendingAmount || 0,  // maximum_lending_amount
        product.interestRateMinimum || 0,   // interest_rate_minimum
        product.interestRateMaximum || 0,   // interest_rate_maximum
        product.termMinimum || 0,           // term_minimum
        product.termMaximum || 0,           // term_maximum
        product.countryOffered || 'US',     // country_offered
        product.isActive !== false,         // is_active (default true)
        product.documentsRequired || [],    // documents_required (array)
        product.description || null         // description
      ]);

      importedCount++;
      if (importedCount % 10 === 0) {
        console.log(`📥 Imported ${importedCount} products...`);
      }
      
    } catch (productError) {
      console.error(`❌ Failed to import product ${product.productName}:`, productError.message);
      skippedCount++;
    }
  }

  await client.query('COMMIT');
  console.log(`✅ Import completed successfully!`);
  console.log(`📊 Summary: ${importedCount} imported, ${skippedCount} skipped`);
  
} catch (error) {
  await client.query('ROLLBACK');
  console.error('❌ Import failed:', error);
  process.exit(1);
} finally {
  await client.end();
  console.log('🔌 Database connection closed');
}