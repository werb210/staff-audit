import express from "express";
import pg from "pg";
import { clientApiAuth } from "../middleware/clientAuth";

const router = express.Router();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

/**
 * @route GET /api/public-lender-products  
 * @desc Returns sanitized lender products for client app use with API key authentication
 */
router.get("/public-lender-products", clientApiAuth, async (_req, res) => {
  try {
    console.log("📦 [PUBLIC-API] Fetching public lender products");
    
    const { rows } = await pool.query(`
      SELECT 
        id,
        name,
        country,
        product_type as "productType"
      FROM lender_products 
      WHERE is_active = true
      ORDER BY name ASC
    `);

    console.log(`✅ [PUBLIC-API] Returning ${rows.length} public lender products`);
    return res.json({ 
      ok: true, 
      count: rows.length,
      products: rows.map(p => ({
        id: p.id,
        name: p.name,
        country: p.country,
        productType: p.productType
      }))
    });
  } catch (err) {
    console.error("❌ [PUBLIC-API] Error fetching public lender products:", err);
    return res.status(500).json({ ok: false, error: "Failed to fetch products" });
  }
});

export default router;