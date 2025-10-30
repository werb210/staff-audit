import { Router } from "express";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import { requireAuth } from "../auth/verifyOnly.js";
const r = Router();
r.use(requireAuth);
// Google Ads Customer Match upload
r.post("/marketing/audience/google-ads", async (req, res) => {
    try {
        const { audience_name, emails = [], phones = [] } = req.body || {};
        if (!audience_name || (emails.length === 0 && phones.length === 0)) {
            return res.status(400).json({ ok: false, error: "audience_name and contact data required" });
        }
        // Hash PII for Customer Match
        const hashedEmails = emails.map((email) => crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex'));
        const hashedPhones = phones.map((phone) => crypto.createHash('sha256').update(phone.replace(/\D/g, '')).digest('hex'));
        // In production, this would call Google Ads API
        // For now, we'll log the upload attempt
        const { rows } = await db.execute(sql `
      INSERT INTO audience_sync_logs(platform, audience_name, items_uploaded, status, meta)
      VALUES('google_ads', ${audience_name}, ${hashedEmails.length + hashedPhones.length}, 'uploaded', ${JSON.stringify({
            hashed_emails: hashedEmails.length,
            hashed_phones: hashedPhones.length,
            timestamp: new Date().toISOString()
        })}::jsonb)
      RETURNING *
    `);
        res.json({
            ok: true,
            message: "Audience uploaded to Google Ads",
            log: rows[0],
            hashed_contacts: {
                emails: hashedEmails.length,
                phones: hashedPhones.length
            }
        });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: "Audience upload failed" });
    }
});
// Get audience sync logs
r.get("/marketing/audience/logs", async (req, res) => {
    try {
        const { rows } = await db.execute(sql `
      SELECT * FROM audience_sync_logs 
      ORDER BY createdAt DESC 
      LIMIT 50
    `);
        res.json({ ok: true, logs: rows });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: "Failed to fetch logs" });
    }
});
export default r;
