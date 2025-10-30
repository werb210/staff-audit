import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { verifyHmac, maskPII } from "../../services/integrations/core";
const router = Router();
/** Generic webhook receiver — HMAC verify if BANK_WEBHOOK_SECRET set */
router.post("/bank", async (req, res) => {
    const secret = String(process.env.BANK_WEBHOOK_SECRET || "");
    const sig = String(req.headers["x-signature"] || req.headers["x-hmac-signature"] || "");
    const raw = JSON.stringify(req.body || {});
    const ok = secret ? verifyHmac(raw, String(sig), secret) : true;
    await db.execute(sql `
    INSERT INTO integration_events(provider, kind, status, message, meta)
    VALUES (${process.env.BANK_PROVIDER || "mock"},'webhook', ${ok ? 'ok' : 'error'}, ${ok ? 'received' : 'bad hmac'}, ${{ body: maskPII(req.body || {}) }})
  `);
    if (!ok)
        return res.status(401).json({ error: "hmac failed" });
    res.json({ ok: true });
});
export default router;
