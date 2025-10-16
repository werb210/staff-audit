import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('🔄 Starting product sync from crm_lender_products_canon...');
  
  // Fetch canonical products
  const { rows } = await pool.query(`
    SELECT
      p.id,
      COALESCE(p.name, p.product_name) AS name,
      p.lender_id,
      p.country::text AS country,
      p.category::text AS category,
      p.amount_min,
      p.amount_max,
      COALESCE(p.is_active, true) AS active
    FROM crm_lender_products_canon p
    ORDER BY p.id
  `);

  console.log('📦 Built canonical products:', rows.length);

  // Clear existing products first for clean sync
  console.log('🧹 Clearing existing lender_products...');
  await pool.query('DELETE FROM lender_products');

  // Insert all canonical products using exact same structure
  let upserts = 0;
  for (const p of rows) {
    try {
      await pool.query(`
        INSERT INTO lender_products (
          id, lender_id, product_name, category, country, 
          amount_min, amount_max, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        p.id,
        p.lender_id,
        p.name,
        p.category || 'working_capital',
        p.country || 'US',
        p.amount_min || 0,
        p.amount_max || 0,
        p.active !== false
      ]);
      upserts++;
    } catch (e) {
      console.error(`❌ Failed to insert product ${p.id}:`, e);
    }
  }
  
  console.log('✅ Sync complete:', upserts, 'products inserted');
  await pool.end();
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('❌ Sync failed:', e);
  process.exit(1);
});