import { Router as makeRouter } from "express";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function getProduct(productId) {
    const q = `
    SELECT id, lender_id, product_name AS name, country, amount_min, amount_max, is_active AS active
    FROM lender_products
    WHERE (id::text = $1 OR id = $1) LIMIT 1;
  `;
    const c = await pool.connect();
    try {
        const r = await c.query(q, [productId]);
        return r.rows[0] || null;
    }
    finally {
        c.release();
    }
}
export function applicationsValidateRouter() {
    const r = makeRouter();
    // Helpful GET (kept for diagnostics)
    r.get("/applications/validate-intake", (_req, res) => {
        res.json({
            ok: true,
            message: "POST intake payload here to validate.",
            required: ["productId", "country", "amountRequested"]
        });
    });
    // Strict JSON validator
    r.post("/applications/validate-intake", async (req, res) => {
        const body = req.body || {};
        const errors = [];
        const details = {};
        const productId = body.productId ?? body.product_id ?? body.product ?? null;
        const country = (body.country ?? "").toString().trim(); // expect "US" or "CA"
        const amount = Number(body.amountRequested ?? body.amount ?? NaN);
        if (!productId)
            errors.push("Missing: productId");
        if (!country)
            errors.push("Missing: country");
        if (!Number.isFinite(amount))
            errors.push("Missing/invalid: amountRequested");
        if (errors.length)
            return res.status(400).json({ ok: false, errors, details });
        try {
            // Lookup product
            const prod = await getProduct(String(productId));
            if (!prod) {
                errors.push(`Product not found: ${productId}`);
                return res.status(400).json({ ok: false, errors, details });
            }
            details.product = {
                id: prod.id,
                name: prod.name,
                country: prod.country,
                amount_min: prod.amount_min,
                amount_max: prod.amount_max,
                active: prod.active
            };
            // Basic checks
            if (prod.active === false)
                errors.push("Product is inactive");
            if (prod.country && country && prod.country !== country) {
                errors.push(`Country mismatch: product=${prod.country}, requested=${country}`);
            }
            if (Number.isFinite(prod.amount_min) && amount < prod.amount_min) {
                errors.push(`Amount below minimum: min=${prod.amount_min}, requested=${amount}`);
            }
            if (Number.isFinite(prod.amount_max) && amount > prod.amount_max) {
                errors.push(`Amount above maximum: max=${prod.amount_max}, requested=${amount}`);
            }
            // Result
            if (errors.length)
                return res.status(200).json({ ok: false, errors, details }); // 200 with ok:false = validated but not eligible
            return res.json({ ok: true, validated: true, details });
        }
        catch (error) {
            return res.status(500).json({
                ok: false,
                errors: [`Database error: ${error instanceof Error ? error.message : String(error)}`],
                details
            });
        }
    });
    return r;
}
