import { Router } from "express";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";
const r = Router();
// List quarantined/pending docs
r.get("/compliance/quarantine", async (_req, res) => {
    const { rows } = await db.execute(sql `select id, name, av_status, quarantine_reason, createdAt from documents where av_status in ('pending','infected') order by createdAt desc`);
    res.json({ ok: true, items: rows });
});
// Release (mark clean)
r.post("/documents/:id/release", async (req, res) => {
    await db.execute(sql `update documents set av_status='clean', quarantine_reason=null where id=${req.params.id}`);
    res.json({ ok: true });
});
// Re-scan (enqueue) - simplified without Redis for now
r.post("/documents/:id/rescan", async (req, res) => {
    await db.execute(sql `update documents set av_status='pending' where id=${req.params.id}`);
    res.json({ ok: true });
});
// Webhook from scanner: { documentId, status, reason? }
r.post("/webhooks/av/result", async (req, res) => {
    const { documentId, status, reason } = req.body || {};
    if (!documentId || !status)
        return res.status(400).json({ ok: false });
    await db.execute(sql `update documents set av_status=${status}, quarantine_reason=${reason || null} where id=${documentId}`);
    res.json({ ok: true });
});
export default r;
