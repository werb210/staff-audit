import { Router } from "express";
const q = pool.query.bind(pool);
import { pool } from "../../db/pool";
import { channelRequiresQA } from "../../services/qaPolicy";
const router = Router();
// Reviewer list
router.get("/", async (_req, res) => {
    const items = await q(`
    SELECT id, channel, to_address, subject, locale, status, createdAt
    FROM comm_outbox
    WHERE status='pending'
    ORDER BY createdAt
    LIMIT 200
  `);
    res.json(items);
});
// Detail preview
router.get("/:id", async (req, res) => {
    const [item] = await q(`SELECT * FROM comm_outbox WHERE id = $1 LIMIT 1`, [req.params.id]);
    res.json(item || null);
});
// Approve & send
router.post("/:id/approve", async (req, res) => {
    const { id } = req.params;
    const [row] = await q(`SELECT * FROM comm_outbox WHERE id = $1 AND status='pending' LIMIT 1`, [id]);
    if (!row)
        return res.status(404).json({ error: "Not found" });
    try {
        if (row.channel === "sms") {
            await fetch("http://localhost:" + process.env.PORT + "/api/comms/sms/send", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contactId: row.contact_id, toNumber: row.to_address, body: row.body })
            });
        }
        else {
            await fetch("http://localhost:" + process.env.PORT + "/api/comms/email/send", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contactId: row.contact_id, toEmail: row.to_address, subject: row.subject, body: row.body })
            });
        }
        await q(`
      UPDATE comm_outbox SET status='sent', reviewer_user_id = $1, reviewed_at=now(), sent_at=now() WHERE id = $2
    `, [req.user?.id || null, id]);
        res.json({ ok: true });
    }
    catch (e) {
        await q(`UPDATE comm_outbox SET status='failed', error = $1 WHERE id = $2`, [e?.message || "send fail", id]);
        res.status(500).json({ error: "Send failed" });
    }
});
// Reject
router.post("/:id/reject", async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body || {};
    await q(`
    UPDATE comm_outbox SET status='rejected', reviewer_user_id = $1, reviewed_at=now(), error = $2
    WHERE id = $3 AND status='pending'
  `, [req.user?.id || null, reason || null, id]);
    res.json({ ok: true });
});
// Helper for senders: either queue to QA or permit immediate send
router.post("/enqueue-or-send", async (req, res) => {
    const { channel, contactId, to, subject, body, templateId, versionId, locale, mergeVars } = req.body || {};
    const needsQA = channelRequiresQA(channel);
    if (needsQA) {
        const [outboxItem] = await q(`
      INSERT INTO comm_outbox(channel, contact_id, to_address, subject, body, template_id, version_id, locale, merge_vars, created_by_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [channel, contactId || null, to, subject || null, body, templateId || null, versionId || null, locale || 'en', JSON.stringify(mergeVars || {}), req.user?.id || null]);
        return res.json({ queued: true, outboxId: outboxItem.id });
    }
    // pass-through (no QA) — call existing send endpoints
    if (channel === "sms") {
        const r = await fetch("http://localhost:" + process.env.PORT + "/api/comms/sms/send", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contactId, toNumber: to, body })
        });
        const result = await r.json();
        return res.json({ sent: true, ...result });
    }
    else {
        const r = await fetch("http://localhost:" + process.env.PORT + "/api/comms/email/send", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contactId, toEmail: to, subject, body })
        });
        const result = await r.json();
        return res.json({ sent: true, ...result });
    }
});
export default router;
