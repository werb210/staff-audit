import { Router } from "express";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";
const router = Router();
// Get contact timeline
router.get("/:id/timeline", async (req, res) => {
    try {
        const { id } = req.params;
        // Get communications timeline for this contact
        const { rows } = await db.execute(sql `
      SELECT 
        id,
        kind,
        direction,
        subject,
        body,
        createdAt,
        meta
      FROM comms 
      WHERE contact_id = ${id}
      ORDER BY createdAt DESC
      LIMIT 100
    `);
        res.json(rows || []);
    }
    catch (error) {
        console.error('[TIMELINE ERROR]', error);
        res.status(500).json({ error: String(error) });
    }
});
// Add timeline entry
router.post("/:id/timeline", async (req, res) => {
    try {
        const { id } = req.params;
        const { kind, direction, subject, body, meta } = req.body;
        await db.execute(sql `
      INSERT INTO comms(contact_id, kind, direction, subject, body, meta, createdAt)
      VALUES(${id}, ${kind}, ${direction}, ${subject || null}, ${body}, ${JSON.stringify(meta || {})}, NOW())
    `);
        res.json({ ok: true });
    }
    catch (error) {
        console.error('[ADD TIMELINE ERROR]', error);
        res.status(500).json({ error: String(error) });
    }
});
export default router;
