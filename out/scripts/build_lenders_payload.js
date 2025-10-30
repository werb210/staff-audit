// scripts/build_lenders_payload.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const { Pool } = pg;
function toSnakeProduct(lenderName, p, fallbackCountry) {
    // Normalize rate_frequency exactly like Backend JSON ("Monthly" / "Annual")
    const freq = p.rateFrequency?.toLowerCase().startsWith("ann")
        ? "Annual"
        : p.rateFrequency?.toLowerCase().startsWith("mon")
            ? "Monthly"
            : p.rateFrequency ?? "Monthly";
    return {
        id: String(p.externalId ?? p.id), // stable if you have externalId; otherwise numeric id as string
        lender_name: lenderName,
        product_name: p.productName || p.name || p.category,
        product_category: p.category,
        description: p.description ?? "",
        minimum_lending_amount: p.minimumLendingAmount ?? p.amountMin ?? null,
        maximum_lending_amount: p.maximumLendingAmount ?? p.amountMax ?? null,
        minimum_credit_score: p.minimumCreditScore ?? null,
        minimum_average_monthly_revenue: p.minimumAverageMonthlyRevenue ?? null,
        interest_rate_minimum: p.interestRateMinimum ?? p.interestRateMin ?? null,
        interest_rate_maximum: p.interestRateMaximum ?? p.interestRateMax ?? null,
        rate_type: p.rateType ?? null,
        rate_frequency: freq,
        term_minimum: p.termMinimum ?? p.termMin ?? null,
        term_maximum: p.termMaximum ?? p.termMax ?? null,
        documents_required: p.documentsRequired ?? p.docRequirements ?? [],
        country_offered: p.countryOffered ?? p.country ?? fallbackCountry,
        is_active: p.isActive,
        created_at: p.createdAt?.toISOString?.() ?? new Date().toISOString(),
        updated_at: p.updatedAt?.toISOString?.() ?? new Date().toISOString(),
        external_id: p.externalId ?? null,
        index: null,
    };
}
export async function buildLendersPayload() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    const allLenders = await pool.query('SELECT * FROM lenders WHERE is_active = true ORDER BY company_name');
    const allProducts = await pool.query(`
    SELECT 
      p.*,
      l.company_name as lender_name,
      l.country as lender_country
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
        if (!lender)
            continue;
        // Map current database structure to expected format
        const productRow = {
            id: p.id,
            lenderId: p.lender_id,
            productName: p.product_name || p.name,
            category: p.category,
            name: p.name,
            countryOffered: p.country,
            country: p.country,
            minimumLendingAmount: null,
            maximumLendingAmount: null,
            interestRateMinimum: null,
            interestRateMaximum: null,
            rateType: p.rate_type,
            rateFrequency: p.rate_frequency,
            termMinimum: null,
            termMaximum: null,
            minimumAverageMonthlyRevenue: null,
            minimumCreditScore: null,
            documentsRequired: null,
            description: p.description,
            isActive: p.is_active,
            createdAt: new Date(p.created_at),
            updatedAt: new Date(p.updated_at),
            externalId: p.id,
            docRequirements: p.doc_requirements,
            amountMin: p.amount_min,
            amountMax: p.amount_max,
            interestRateMin: p.interest_rate_min,
            interestRateMax: p.interest_rate_max,
            termMin: p.term_min,
            termMax: p.term_max
        };
        const snake = toSnakeProduct(lender.company_name, productRow, lender.country ?? "United States");
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
