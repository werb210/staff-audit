import { Router } from "express";
const router = Router();
/**
 * GET /api/communications/threads
 * Returns the left-pane list: contacts that have any SMS/email/call activity.
 * Optional query:
 *   types=sms|email|call (comma-separated)
 *   q=<search by name, company, phone, email>
 *   limit, cursor (pagination, opaque cursor id or timestamp)
 */
router.get("/threads", async (req, res) => {
    try {
        const typesRaw = req.query.types?.trim();
        const types = typesRaw ? typesRaw.split(",").map(s => s.trim().toLowerCase()) : ["sms", "email", "call"];
        const q = req.query.q?.trim();
        const limit = Math.min(Number(req.query.limit ?? 50), 100);
        const cursor = req.query.cursor ?? null;
        // TODO: Replace these with your actual ORM queries.
        // Expectation:
        // - communications table OR union view of sms_messages, emails, calls
        // - join to contacts table
        // - group by contact_id with MAX(createdAt) as lastActivity
        // - filter by types and optional search `q`
        const results = await (req.app.locals.db?.communications?.getThreads?.({
            types, q, limit, cursor
        }) || {
            items: [
                { contactId: "demo-1", name: "Demo Contact", company: "Acme Co", lastActivity: new Date().toISOString(), lastSnippet: "Hello from SMS…" }
            ],
            nextCursor: null
        });
        res.json(results);
    }
    catch (err) {
        console.error("[COMM] threads error:", err);
        res.status(500).json({ error: "threads_failed", message: err?.message ?? "unknown" });
    }
});
/**
 * GET /api/communications?contactId=<uuid>&types=sms,email,call
 * Returns the right-pane conversation for a single contact.
 * Supports pagination: limit, before (ISO or timestamp), after
 */
router.get("/", async (req, res) => {
    try {
        const contactId = req.query.contactId?.trim();
        if (!contactId)
            return res.status(400).json({ error: "missing_contactId" });
        const typesRaw = req.query.types?.trim();
        const types = typesRaw ? typesRaw.split(",").map(s => s.trim().toLowerCase()) : ["sms", "email", "call"];
        const limit = Math.min(Number(req.query.limit ?? 100), 200);
        const before = req.query.before ?? undefined;
        const after = req.query.after ?? undefined;
        // TODO: Replace with actual ORM queries.
        // Expectation:
        // - fetch messages (union) for this contactId filtered by types
        // - order by createdAt ASC
        const messages = await (req.app.locals.db?.communications?.getMessages?.({
            contactId, types, limit, before, after
        }) || [
            { id: "m1", type: "sms", direction: "inbound", at: new Date(Date.now() - 3600000).toISOString(), text: "Hi there" },
            { id: "m2", type: "sms", direction: "outbound", at: new Date().toISOString(), text: "Thanks for reaching out!" }
        ]);
        res.json({ contactId, messages });
    }
    catch (err) {
        console.error("[COMM] messages error:", err);
        res.status(500).json({ error: "messages_failed", message: err?.message ?? "unknown" });
    }
});
/**
 * GET /api/templates
 * Return message templates (fixes the 404 in your screenshot).
 * Query: kind=sms|email (optional; default: all)
 */
router.get("/templates", async (req, res) => {
    try {
        const kind = (req.query.kind?.toLowerCase());
        const rows = await (req.app.locals.db?.templates?.getTemplates?.({ kind }) || [
            { id: "t1", kind: "sms", name: "Doc Rejected", body: "We reviewed your documents…" },
            { id: "t2", kind: "email", name: "Welcome", subject: "Welcome to Boreal", body: "Thanks for applying…" }
        ].filter(x => !kind || x.kind === kind));
        res.json({ items: rows });
    }
    catch (err) {
        console.error("[COMM] templates error:", err);
        res.status(500).json({ error: "templates_failed", message: err?.message ?? "unknown" });
    }
});
import { sendSms } from "../services/twilioSms";
import { sendUserEmail } from "../services/o365Mail";
import { startOutboundCall } from "../services/twilioVoice";
// POST /api/communications/sms
router.post("/sms", async (req, res) => {
    try {
        const { contactId, to, body } = req.body;
        if (!contactId || !to || !body)
            return res.status(400).json({ error: "missing_fields" });
        const sent = await sendSms({ to, body });
        // Persist to your comms log (shimbed here)
        const record = await (req.app.locals.db?.communications?.appendMessage?.({
            contactId,
            type: "sms",
            direction: "outbound",
            at: new Date().toISOString(),
            payload: sent,
            text: body
        }) ?? { id: "stub-log-" + Date.now() });
        res.json({ ok: true, messageId: record.id, provider: sent.provider });
    }
    catch (err) {
        console.error("[COMM] sms send error:", err);
        res.status(500).json({ error: "sms_send_failed", message: err?.message ?? "unknown" });
    }
});
// POST /api/communications/email
router.post("/email", async (req, res) => {
    try {
        const { contactId, to, subject, text, html } = req.body;
        if (!contactId || !to || !subject)
            return res.status(400).json({ error: "missing_fields" });
        const sent = await sendUserEmail({ to, subject, text, html });
        const record = await (req.app.locals.db?.communications?.appendMessage?.({
            contactId,
            type: "email",
            direction: "outbound",
            at: new Date().toISOString(),
            payload: sent,
            text: text ?? "",
            subject
        }) ?? { id: "stub-log-" + Date.now() });
        res.json({ ok: true, messageId: record.id, provider: sent.provider });
    }
    catch (err) {
        console.error("[COMM] email send error:", err);
        res.status(500).json({ error: "email_send_failed", message: err?.message ?? "unknown" });
    }
});
router.post("/call", async (req, res) => {
    try {
        const { contactId, to, agentNumber } = req.body;
        if (!contactId || !to)
            return res.status(400).json({ error: "missing_fields" });
        const started = await startOutboundCall({ to, agentNumber });
        // Log the call in the unified comms log
        const record = await (req.app.locals.db?.communications?.appendMessage?.({
            contactId,
            type: "call",
            direction: "outbound",
            at: new Date().toISOString(),
            payload: started,
            text: `Outbound call to ${to}`
        }) ?? { id: "stub-call-" + Date.now() });
        res.json({ ok: true, callSid: started.sid, messageId: record.id, provider: started.provider });
    }
    catch (err) {
        console.error("[COMM] call start error:", err);
        res.status(500).json({ error: "call_start_failed", message: err?.message ?? "unknown" });
    }
});
/**
 * GET /api/communications/contact-by-phone?phone=+1...
 * Returns contactId + name if phone matches.
 */
router.get("/contact-by-phone", async (req, res) => {
    try {
        const phone = req.query.phone?.trim();
        if (!phone)
            return res.status(400).json({ error: "missing_phone" });
        const contact = await (req.app.locals.db?.contacts?.findByPhone?.(phone) ??
            { id: null, name: null });
        if (!contact || !contact.id)
            return res.json({ found: false });
        res.json({ found: true, contactId: contact.id, name: contact.name });
    }
    catch (err) {
        console.error("[COMM] contact-by-phone error:", err);
        res.status(500).json({ error: "lookup_failed", message: err?.message ?? "unknown" });
    }
});
export default router;
