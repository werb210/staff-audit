import { Router as makeRouter } from "express";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const FALLBACK = {
    "*": [
        { key: 'bank_statements_6m', name: 'Bank Statements (6 months)', required: true },
        { key: 'tax_returns_3y', name: 'Business Tax Returns (3 years)', required: true },
        { key: 'financials_pl_bs', name: 'Financial Statements (P&L & BS)', required: true },
    ],
    equipment_financing: [
        { key: 'equipment_quote', name: 'Equipment Quote', required: true },
    ],
    term_loan: [{ key: 'cash_flow_statement', name: 'Cash Flow Statement', required: true }],
    invoice_factoring: [{ key: 'ar_aging', name: 'Accounts Receivable Aging', required: true }],
    purchase_order_financing: [{ key: 'purchase_orders', name: 'Purchase Orders', required: true }],
    asset_based_lending: [{ key: 'asset_valuation', name: 'Asset Valuation', required: true }],
};
export function requiredDocsRouter() {
    const r = makeRouter();
    r.get("/required-docs", async (req, res) => {
        const pid = String(req.query.productId || "");
        const client = await pool.connect();
        try {
            // If there is a dedicated table, use it; else use category-driven fallback
            const hasTable = await client.query(`SELECT to_regclass('public.required_docs') AS t`);
            if (hasTable.rows?.[0]?.t) {
                if (pid) {
                    const q = await client.query(`SELECT key, name, required, category, conditions FROM required_docs WHERE product_id = $1`, [pid]);
                    return res.json(q.rows);
                }
                else {
                    const q = await client.query(`SELECT DISTINCT key, name, required, category FROM required_docs`);
                    return res.json(q.rows);
                }
            }
            if (!pid)
                return res.json(FALLBACK["*"]);
            const p = await client.query(`SELECT category FROM lender_products WHERE id=$1 LIMIT 1`, [pid]);
            const cat = p.rows?.[0]?.category || "";
            const docs = [...(FALLBACK["*"] || []), ...(FALLBACK[cat] || [])];
            res.json(docs);
        }
        catch (e) {
            res.status(500).json({ ok: false, error: e?.message || String(e) });
        }
        finally {
            client.release();
        }
    });
    return r;
}
