import { Router as makeRouter } from "express";
import { Pool } from "pg";
import crypto from "crypto";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export function stateRouter() {
    const r = makeRouter();
    r.get("/_int/state", async (_req, res) => {
        const c = await pool.connect();
        try {
            const dbHost = (() => { try {
                return new URL(process.env.DATABASE_URL).host;
            }
            catch {
                return "";
            } })();
            const [{ rows: pc }, { rows: lc }] = await Promise.all([
                c.query("SELECT COUNT(*)::int AS c FROM lender_products WHERE COALESCE(is_active,true)=true"),
                c.query("SELECT COUNT(*)::int AS c FROM lenders")
            ]);
            const token = process.env.CLIENT_SHARED_BEARER || "";
            const token_fp = crypto.createHash("sha256").update(token).digest("hex").slice(0, 12);
            res.json({ ok: true, app_url: process.env.APP_URL || null, db_host: dbHost,
                products_count: pc?.[0]?.c ?? 0, lenders_count: lc?.[0]?.c ?? 0, token_fp });
        }
        catch (e) {
            res.status(500).json({ ok: false, error: e?.message || String(e) });
        }
        finally {
            c.release();
        }
    });
    return r;
}
