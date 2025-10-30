import { Router } from "express";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";
const router = Router();
// Client -> staff chat
router.post("/chat/send", async (req, res) => {
    try {
        const { contactId, body } = req.body || {};
        await db.execute(sql `
      INSERT INTO comms(contact_id, kind, direction, body, createdAt) 
      VALUES(${contactId}, 'chat', 'in', ${body}, NOW())
    `);
        res.json({ ok: true });
    }
    catch (error) {
        console.error('[CLIENT CHAT ERROR]', error);
        res.status(500).json({ ok: false, error: String(error) });
    }
});
// Staff -> client chat
router.post("/chat/reply", async (req, res) => {
    try {
        const { contactId, body } = req.body || {};
        await db.execute(sql `
      INSERT INTO comms(contact_id, kind, direction, body, createdAt) 
      VALUES(${contactId}, 'chat', 'out', ${body}, NOW())
    `);
        res.json({ ok: true });
    }
    catch (error) {
        console.error('[CHAT REPLY ERROR]', error);
        res.status(500).json({ ok: false, error: String(error) });
    }
});
// Client "report an error"
router.post("/issues", async (req, res) => {
    try {
        const { contactId, message, appContext } = req.body || {};
        await db.execute(sql `
      INSERT INTO issues(contact_id, message, app_context, createdAt) 
      VALUES(${contactId}, ${message}, ${JSON.stringify(appContext || {})}, NOW())
    `);
        res.json({ ok: true });
    }
    catch (error) {
        console.error('[ISSUE REPORT ERROR]', error);
        res.status(500).json({ ok: false, error: String(error) });
    }
});
export default router;
