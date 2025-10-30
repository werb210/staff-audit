import { Router } from "express";
const q = pool.query.bind(pool);
import twilio from "twilio";
import { pool } from "../../db/pool";
import { COMMS_CONSTANTS } from "../../config/comms";
import { logContactActivity } from "../../services/activityLog";
import { publish } from "../../realtime/hub";
const router = Router();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
router.post("/send", async (req, res) => {
    // Import rate limiting middleware
    const { smsLimiter, enforceCooldown } = await import("../../middleware/rateLimit");
    // Apply rate limiting
    await new Promise((resolve, reject) => {
        smsLimiter(req, res, (err) => {
            if (err)
                reject(err);
            else
                resolve(void 0);
        });
    });
    // body: { contactId, toNumber, body, threadId? }
    const { contactId, toNumber, body, threadId } = req.body || {};
    if (!contactId || !toNumber || !body)
        return res.status(400).json({ error: "Missing fields" });
    // Check cooldown
    try {
        await enforceCooldown(`sms:${contactId}`, Number(process.env.COOLDOWN_SMS_SECONDS || 90));
    }
    catch {
        return res.status(429).json({ error: "SMS cooldown in effect" });
    }
    let tId = threadId;
    if (!tId) {
        const [t] = await q(`
      INSERT INTO comm_threads (contact_id, channel) 
      VALUES ($1, 'sms') 
      RETURNING id
    `, [contactId]);
        tId = t.id;
    }
    try {
        const msg = await client.messages.create({
            from: COMMS_CONSTANTS.SMS_FROM, // BF SMS number
            to: toNumber,
            body,
        });
        await q(`
      INSERT INTO comm_messages (thread_id, direction, channel, body, meta, created_by_user_id)
      VALUES ($1, 'out', 'sms', $2, $3, $4)
    `, [tId, body, JSON.stringify({ sid: msg.sid }), req.user?.id]);
        // Log activity and publish realtime update
        await logContactActivity({
            contactId,
            type: "sms",
            direction: "out",
            title: "SMS sent",
            body,
            meta: { sid: msg.sid, toNumber, from: COMMS_CONSTANTS.SMS_FROM }
        });
        publish(`thread:${tId}`, { kind: "sms", direction: "out", body, sid: msg.sid });
        // Trigger SLA hook for outbound message
        const { onOutboundMessage } = await import("../../services/slaV2");
        await onOutboundMessage(tId);
        return res.json({ ok: true, threadId: tId, sid: msg.sid });
    }
    catch (error) {
        console.error('SMS send error:', error);
        return res.status(500).json({ error: 'Failed to send SMS' });
    }
});
// Twilio inbound webhook
router.post("/webhook/inbound", async (req, res) => {
    const from = req.body.From;
    const to = req.body.To;
    const body = req.body.Body || "";
    const contactId = req.body._contactId || null; // If you map numbers → contacts elsewhere
    try {
        const [thread] = await q(`
      SELECT id FROM comm_threads 
      WHERE channel = 'sms' 
      LIMIT 1
    `);
        let threadId = thread?.id;
        if (!threadId) {
            const [newThread] = await q(`
        INSERT INTO comm_threads (contact_id, channel) 
        VALUES ($1, 'sms') 
        RETURNING id
      `, [contactId]);
            threadId = newThread.id;
        }
        await q(`
      INSERT INTO comm_messages (thread_id, direction, channel, body, meta)
      VALUES ($1, 'in', 'sms', $2, $3)
    `, [threadId, body, JSON.stringify({ from, to })]);
        // Log activity and publish realtime update
        await logContactActivity({
            contactId: contactId || "unknown",
            type: "sms",
            direction: "in",
            title: "SMS received",
            body,
            meta: { from, to }
        });
        publish(`thread:${threadId}`, { kind: "sms", direction: "in", body, from, to });
        // Check for SMS opt-out keywords 
        const text = String(body || "").trim().toUpperCase();
        const stopList = (process.env.SMS_OPTOUT_KEYWORDS || "STOP,STOPALL,UNSUBSCRIBE,QUIT,CANCEL,END").split(",").map(s => s.trim());
        if (stopList.includes(text)) {
            if (contactId)
                await q(`UPDATE contacts SET sms_opt_out=true WHERE id=$1`, [contactId]);
        }
        else {
            // Trigger SLA hook for inbound message if not opting out
            const { onInboundMessage } = await import("../../services/slaV2");
            await onInboundMessage(threadId);
        }
        // Respond to Twilio with 200 OK (no auto-reply)
        res.type("text/xml").send("<Response></Response>");
    }
    catch (error) {
        console.error('SMS webhook error:', error);
        res.type("text/xml").send("<Response></Response>");
    }
});
// Twilio message status callback
router.post("/status", async (req, res) => {
    const sid = req.body.MessageSid;
    const status = req.body.MessageStatus; // queued|sent|delivered|failed...
    // Update message delivery_status
    await q(`UPDATE comm_messages SET delivery_status = $1 WHERE meta::json->>'sid' = $2`, [status, sid]);
    // Optional: log activity (requires contactId lookup from thread)
    res.type("text/xml").send("<Response></Response>");
});
// Remove duplicate webhook handler
export default router;
