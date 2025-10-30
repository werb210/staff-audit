import { Router } from "express";
import { requireAuth } from "../auth/verifyOnly";
import { db } from "../db/drizzle";
import { comms, contacts } from "../db/schema";
import { getToken } from "../services/graph";
import fetch from "node-fetch";
import { eq, sql } from "drizzle-orm";
const r = Router();
r.use(requireAuth);
// Simple list of contacts as "threads"
r.get("/threads", async (_req, res) => {
    const rows = await db.select().from(contacts);
    res.json({ ok: true, items: rows.map((c) => ({ id: c.id, name: c.fullName, email: c.email, phone: c.phone })) });
});
// Thread detail: merge SMS/Chat from DB + Email from Graph (read-only) with optional kind filters
r.get("/thread/:contactId", async (req, res) => {
    const contactId = req.params.contactId;
    const [c] = await db.select().from(contacts).where(eq(contacts.id, contactId));
    if (!c)
        return res.status(404).json({ ok: false, error: "contact_not_found" });
    // Get kinds filter (?kinds=sms,email,call,note,meeting)
    const kinds = String(req.query.kinds || "").split(",").filter(Boolean);
    const includeEmail = kinds.length === 0 || kinds.includes("email");
    let rows = await db.select().from(comms).where(eq(comms.contactId, contactId));
    // Filter by kinds if specified
    if (kinds.length > 0) {
        rows = rows.filter((r) => kinds.includes(r.kind));
    }
    let emails = [];
    if (includeEmail) {
        try {
            const token = await getToken(req.user.sub);
            if (c.email) {
                const inRsp = await fetch(`https://graph.microsoft.com/v1.0/me/messages?$top=25&$orderby=receivedDateTime DESC&$filter=from/emailAddress/address eq '${c.email}'`, { headers: { Authorization: `Bearer ${token}` } });
                const inJ = await inRsp.json();
                emails = emails.concat((inJ.value || []).map((m) => ({ kind: "email", direction: "in", body: m.subject, meta: { id: m.id, snippet: m.bodyPreview }, createdAt: m.receivedDateTime })));
                const outRsp = await fetch(`https://graph.microsoft.com/v1.0/me/messages?$top=25&$orderby=sentDateTime DESC&$filter=toRecipients/any(t: t/emailAddress/address eq '${c.email}')`, { headers: { Authorization: `Bearer ${token}` } });
                const outJ = await outRsp.json();
                emails = emails.concat((outJ.value || []).map((m) => ({ kind: "email", direction: "out", body: m.subject, meta: { id: m.id, snippet: m.bodyPreview }, createdAt: m.sentDateTime })));
            }
        }
        catch { /* not connected → show SMS/Chat only */ }
    }
    const merged = [...rows, ...emails].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    res.json({ ok: true, items: merged });
});
// Mark all messages as read in a thread (read receipts)
r.post("/thread/:contactId/read", async (req, res) => {
    await db.execute(sql `update comms set read_at=now() where contact_id=${req.params.contactId} and direction='in' and read_at is null`);
    const contactId = String(req.params.contactId);
    const { rows } = await db.execute(sql `select id from contacts where id=${contactId} limit 1`);
    if (rows?.[0])
        require("./../routes/realtime"); // no-op import to ensure side effects
    const { publishMessage } = require("../routes/realtime");
    publishMessage({ contactId, type: "read", payload: {} });
    res.json({ ok: true });
});
export default r;
