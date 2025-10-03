// scripts/build_lenders_payload.js - Compiled from TypeScript
import pkg from 'pg';
const { Pool } = pkg;

function toSnakeProduct(lenderName, p, fallbackCountry) {
  // Normalize rate_frequency exactly like Backend JSON ("Monthly" / "Annual")
  const freq =
    p.rate_frequency?.toLowerCase().startsWith("ann")
      ? "Annual"
      : p.rate_frequency?.toLowerCase().startsWith("mon")
      ? "Monthly"
      : p.rate_frequency ?? "Monthly";

  return {
    id: String(p.external_id ?? p.id), // stable if you have externalId; otherwise numeric id as string
    lender_name: lenderName,
    product_name: p.product_name || p.name || p.category,
    product_category: p.category,
    description: p.description ?? "",
    minimum_lending_amount: p.amount_min ?? null,
    maximum_lending_amount: p.amount_max ?? null,
    minimum_credit_score: null,
    minimum_average_monthly_revenue: null,
    interest_rate_minimum: p.interest_rate_min ?? null,
    interest_rate_maximum: p.interest_rate_max ?? null,
    rate_type: p.rate_type ?? null,
    rate_frequency: freq,
    term_minimum: p.term_min ?? null,
    term_maximum: p.term_max ?? null,
    documents_required: p.doc_requirements ?? [],
    country_offered: p.country ?? fallbackCountry,
    is_active: p.is_active,
    created_at: p.created_at?.toISOString?.() ?? new Date().toISOString(),
    updated_at: p.updated_at?.toISOString?.() ?? new Date().toISOString(),
    external_id: p.id ?? null,
    index: null,
  };
}

export async function buildLendersPayload() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const allLenders = await pool.query('SELECT * FROM lenders WHERE is_active = true ORDER BY company_name');
  const allProducts = await pool.query(`
    SELECT 
      p.*,
      l.company_name as lender_name
    FROM lender_products p
    JOIN lenders l ON l.id = p.lender_id
    WHERE p.is_active = true
    ORDER BY l.company_name, p.product_name
  `);

  const lendersMap = new Map();
  allLenders.rows.forEach((l) => lendersMap.set(l.id, l));

  const grouped = new Map();

  for (const l of allLenders.rows) {
    grouped.set(l.company_name, { name: l.company_name, products: [] });
  }

  const flatProducts = [];

  for (const p of allProducts.rows) {
    const lender = lendersMap.get(p.lender_id);
    if (!lender) continue;
    
    const snake = toSnakeProduct(lender.company_name, p, "Canada");
    grouped.get(lender.company_name).products.push(snake);
    flatProducts.push(snake);
  }

  await pool.end();

  // Remove lenders with 0 products (optional; Backend JSON omitted such lenders)
  const lendersArray = Array.from(grouped.values()).filter((l) => l.products.length > 0);

  return {
    exportedAt: new Date().toISOString(),
    totalLenders: lendersArray.length,
    totalProducts: flatProducts.length,
    lenders: lendersArray,
    allProducts: flatProducts,
  };
}

// Test execution when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildLendersPayload().then(data => {
    console.log(JSON.stringify(data, null, 2));
  }).catch(console.error);
}