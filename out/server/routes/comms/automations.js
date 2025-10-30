import { Router } from "express";
const q = pool.query.bind(pool);
import { pool } from "../../db/pool";
import { scheduleReminder } from "../../services/automatedReminders";
const router = Router();
// Get reminder queue
router.get("/reminders", async (req, res) => {
    try {
        const { status, limit = 100 } = req.query;
        let query = `SELECT * FROM reminders_queue`;
        let params = [];
        if (status) {
            query += ` WHERE status = $1`;
            params.push(status);
        }
        query += ` ORDER BY scheduled_for DESC LIMIT $${params.length + 1}`;
        params.push(Number(limit));
        const reminders = await q(query, params);
        res.json(reminders);
    }
    catch (error) {
        console.error('Reminders queue error:', error);
        res.status(500).json({ error: 'Failed to fetch reminders' });
    }
});
// Schedule a new reminder
router.post("/reminders", async (req, res) => {
    try {
        const { targetType, targetId, channel, templateId, delayHours, vars } = req.body;
        await scheduleReminder({
            targetType,
            targetId,
            channel,
            templateId,
            delayHours: Number(delayHours || 24),
            vars: vars || {}
        });
        res.json({ success: true, message: "Reminder scheduled" });
    }
    catch (error) {
        console.error('Schedule reminder error:', error);
        res.status(500).json({ error: 'Failed to schedule reminder' });
    }
});
// Cancel a reminder
router.delete("/reminders/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await q(`UPDATE reminders_queue SET status='canceled' WHERE id=$1`, [id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Cancel reminder error:', error);
        res.status(500).json({ error: 'Failed to cancel reminder' });
    }
});
// SMS opt-out management
router.post("/contacts/:contactId/sms-optout", async (req, res) => {
    try {
        const { contactId } = req.params;
        const { optOut = true } = req.body;
        await q(`UPDATE contacts SET sms_opt_out=$1 WHERE id=$2`, [optOut, contactId]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('SMS opt-out error:', error);
        res.status(500).json({ error: 'Failed to update SMS opt-out' });
    }
});
// Process automation triggers (missing docs, lender decisions, etc.)
router.post("/triggers/missing-docs", async (req, res) => {
    try {
        const { applicationId } = req.body;
        // Find applications with missing documents
        const apps = applicationId
            ? await q(`SELECT id, contact_id FROM applications WHERE id=$1`, [applicationId])
            : await q(`
          SELECT a.id, a.contact_id 
          FROM applications a
          WHERE a.stage IN ('Requires Docs', 'In Review')
          AND EXISTS (
            SELECT 1 FROM documents d 
            WHERE d.applicationId = a.id AND d.status IN ('uploaded', 'rejected')
          )
          LIMIT 50
        `);
        // Find missing docs reminder template
        const [template] = await q(`
      SELECT id FROM comm_templates 
      WHERE kind='automation' AND trigger->>'event' = 'missing_docs'
      AND is_active=true LIMIT 1
    `);
        if (!template) {
            return res.status(400).json({ error: 'Missing docs template not found' });
        }
        let scheduled = 0;
        for (const app of apps) {
            await scheduleReminder({
                targetType: "application",
                targetId: app.id,
                channel: "email",
                templateId: template.id,
                delayHours: 2 // Send in 2 hours if business hours
            });
            scheduled++;
        }
        res.json({ success: true, scheduled });
    }
    catch (error) {
        console.error('Missing docs trigger error:', error);
        res.status(500).json({ error: 'Failed to process missing docs trigger' });
    }
});
export default router;
