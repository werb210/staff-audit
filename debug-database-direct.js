/**
 * Debug Database Direct Query
 * Bypass API and query database directly to understand data structure
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function debugDatabaseDirect() {
  try {
    console.log('🔍 DIRECT DATABASE QUERY DEBUG\n');
    
    // Query raw data directly
    const result = await pool.query(`
      SELECT id, product_name, product_type, category, country, name
      FROM lender_products 
      WHERE product_type IN ('purchase_order_financing', 'working_capital')
      OR category NOT IN ('line_of_credit', 'term_loan', 'equipment_financing', 'invoice_factoring')
      ORDER BY product_name
      LIMIT 10
    `);
    
    console.log('Raw database results:');
    console.log('Columns:', result.fields.map(f => f.name));
    console.log('Rows:', result.rows.length);
    
    result.rows.forEach((row, index) => {
      console.log(`\nRow ${index + 1}:`);
      console.log(`  product_name: ${row.product_name}`);
      console.log(`  product_type: ${row.product_type}`);
      console.log(`  category: ${row.category}`);
      console.log(`  country: ${row.country}`);
      console.log(`  name: ${row.name}`);
    });
    
    // Check overall distribution
    const summaryResult = await pool.query(`
      SELECT 
        category,
        product_type,
        COUNT(*) as count
      FROM lender_products 
      GROUP BY category, product_type
      ORDER BY category, product_type
    `);
    
    console.log('\n📊 CATEGORY VS PRODUCT_TYPE DISTRIBUTION:');
    summaryResult.rows.forEach(row => {
      console.log(`  category: ${row.category || 'NULL'} | product_type: ${row.product_type || 'NULL'} | count: ${row.count}`);
    });
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await pool.end();
  }
}

debugDatabaseDirect();