import { Router as makeRouter } from "express";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
function stamp(res) {
    const dbHost = (() => { try {
        return new URL(process.env.DATABASE_URL).host;
    }
    catch {
        return "";
    } })();
    if (!res.headersSent) {
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Instance", process.env.APP_URL || "staff");
        res.setHeader("X-DB-Host", dbHost);
        if (process.env.GIT_SHA)
            res.setHeader("X-Git-SHA", process.env.GIT_SHA);
    }
}
export function productsV1Router() {
    const r = makeRouter();
    r.get("/", async (_req, res) => {
        const client = await pool.connect();
        try {
            const q = await client.query(`
        SELECT id, lender_id, product_name as name, country, amount_min, amount_max, category, is_active as active
        FROM lender_products
        WHERE COALESCE(is_active,true)=true
        ORDER BY product_name NULLS LAST
      `);
            stamp(res);
            res.json(q.rows.map((p) => ({
                id: String(p.id), lender_id: p.lender_id ?? null, name: p.name ?? null,
                country: p.country ?? "US",
                amount_min: Number(p.amount_min ?? 0), amount_max: Number(p.amount_max ?? 0),
                category: p.category ?? "working_capital", active: Boolean(p.active ?? true)
            })));
        }
        catch (e) {
            stamp(res);
            res.status(500).json({ ok: false, error: e?.message || String(e) });
        }
        finally {
            client.release();
        }
    });
    return r;
}
export default productsV1Router;
