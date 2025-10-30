// ✅ Fetch active lender products from DB
import { db } from '../../db/index';
export async function getLenderProducts(req, res) {
    try {
        const { sql } = await import('drizzle-orm');
        const result = await db.execute(sql `
      SELECT 
        lp.id, lp.lender_id, lp.name, lp.category, lp.status,
        lp.min_amount, lp.max_amount, lp.interest_rate_min, lp.interest_rate_max,
        lp.description, lp.createdAt, lp.updatedAt,
        l.id as lender_id, l.name as lender_name
      FROM lender_products lp
      LEFT JOIN lenders l ON lp.lender_id = l.id
      WHERE lp.status = 'active' OR lp.status IS NULL
      ORDER BY lp.createdAt DESC
    `);
        const products = result.rows.map((row) => ({
            ...row,
            lender: row.lender_id ? {
                id: row.lender_id,
                name: row.lender_name
            } : null
        }));
        return res.status(200).json({
            ok: true,
            count: products.length,
            products,
        });
    }
    catch (err) {
        console.error('❌ Error fetching lender products:', err);
        return res.status(500).json({
            ok: false,
            error: 'Failed to fetch lender products',
        });
    }
}
