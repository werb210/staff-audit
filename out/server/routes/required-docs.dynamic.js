import { Router as makeRouter } from "express";
import { Pool } from "pg";
import { aggregateRequiredDocs } from "../services/requiredDocs";
import { requireAdminToken } from "../middleware/requireAdminToken";
import { requireLenderAuth } from "../middleware/requireLenderAuth";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export function requiredDocsDynamicRouter() {
    const r = makeRouter();
    // READ (client-facing via shared token upstream)
    r.get("/required-docs", async (req, res) => {
        try {
            const { productId, lenderId } = { productId: req.query.productId, lenderId: req.query.lenderId };
            const docs = await aggregateRequiredDocs({ productId, lenderId });
            return res.json(docs);
        }
        catch (e) {
            return res.status(500).json({ ok: false, error: e?.message || String(e) });
        }
    });
    // ADMIN CRUD (master)
    r.post("/_admin/required-docs/master", requireAdminToken, async (req, res) => {
        const { key, name, description, category, default_required = false, allowed_mime = null, min_count = 1, max_count = null, meta = null } = req.body || {};
        if (!key || !name)
            return res.status(400).json({ ok: false, error: "key_and_name_required" });
        const c = await pool.connect();
        try {
            await c.query(`INSERT INTO required_docs_master(key,name,description,category,default_required,allowed_mime,min_count,max_count,meta)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                     ON CONFLICT (key) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, category=EXCLUDED.category,
                       default_required=EXCLUDED.default_required, allowed_mime=EXCLUDED.allowed_mime, min_count=EXCLUDED.min_count,
                       max_count=EXCLUDED.max_count, meta=EXCLUDED.meta`, [key, name, description, category, default_required, allowed_mime, min_count, max_count, meta]);
            res.json({ ok: true });
        }
        finally {
            c.release();
        }
    });
    // ADMIN attach to product
    r.post("/_admin/products/:productId/required-docs", requireAdminToken, async (req, res) => {
        const { productId } = req.params;
        const { doc_key, required = true, conditions = null } = req.body || {};
        if (!doc_key)
            return res.status(400).json({ ok: false, error: "doc_key_required" });
        const c = await pool.connect();
        try {
            await c.query(`INSERT INTO product_required_docs(product_id,doc_key,required,conditions)
                     VALUES ($1,$2,$3,$4)
                     ON CONFLICT (product_id,doc_key) DO UPDATE SET required=EXCLUDED.required, conditions=EXCLUDED.conditions`, [productId, doc_key, required, conditions]);
            res.json({ ok: true });
        }
        finally {
            c.release();
        }
    });
    // ADMIN attach to lender
    r.post("/_admin/lenders/:lenderId/required-docs", requireAdminToken, async (req, res) => {
        const { lenderId } = req.params;
        const { doc_key, required = true, conditions = null } = req.body || {};
        if (!doc_key)
            return res.status(400).json({ ok: false, error: "doc_key_required" });
        const c = await pool.connect();
        try {
            await c.query(`INSERT INTO lender_required_docs(lender_id,doc_key,required,conditions)
                     VALUES ($1,$2,$3,$4)
                     ON CONFLICT (lender_id,doc_key) DO UPDATE SET required=EXCLUDED.required, conditions=EXCLUDED.conditions`, [lenderId, doc_key, required, conditions]);
            res.json({ ok: true });
        }
        finally {
            c.release();
        }
    });
    // LENDER self-service (limit to their lender_id)
    r.put("/lenders/:lenderId/required-docs/:docKey", requireLenderAuth, async (req, res) => {
        const { lenderId, docKey } = req.params;
        const { required = true, conditions = null } = req.body || {};
        const c = await pool.connect();
        try {
            await c.query(`INSERT INTO lender_required_docs(lender_id,doc_key,required,conditions)
                     VALUES ($1,$2,$3,$4)
                     ON CONFLICT (lender_id,doc_key) DO UPDATE SET required=EXCLUDED.required, conditions=EXCLUDED.conditions`, [lenderId, docKey, required, conditions]);
            res.json({ ok: true });
        }
        finally {
            c.release();
        }
    });
    return r;
}
