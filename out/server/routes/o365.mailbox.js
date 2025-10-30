import { Router } from "express";
import fetch from "node-fetch";
import { requireAuth } from "../auth/verifyOnly.js";
const r = Router();
r.use(requireAuth);
async function graph(token, path, init = {}) {
    const headers = { Authorization: `Bearer ${token}` };
    if (init.json) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(init.json);
        delete init.json;
    }
    const rsp = await fetch(`https://graph.microsoft.com/v1.0${path}`, { ...init, headers });
    const j = await rsp.json();
    if (!rsp.ok)
        throw new Error(j?.error?.message || "graph_error");
    return j;
}
async function getToken(userId) {
    // Mock token for development - replace with actual Graph service user token
    return process.env.GRAPH_SERVICE_TOKEN || "mock_token";
}
// List last 50 messages, optionally filtered by contact email
r.get("/o365/messages", async (req, res) => {
    try {
        const { contactEmail } = req.query;
        const token = await getToken(process.env.O365_SERVICE_USER_ID);
        // Pull server-side then filter by participants for reliability
        const j = await graph(token, `/me/messages?$top=50&$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview,conversationId`);
        let items = j.value || [];
        if (contactEmail) {
            const needle = String(contactEmail).toLowerCase();
            const hasAddr = (rec = []) => rec.some((r) => String(r.emailAddress?.address || "").toLowerCase() === needle);
            items = items.filter((m) => String(m.from?.emailAddress?.address || "").toLowerCase() === needle ||
                hasAddr(m.toRecipients || []) ||
                hasAddr(m.ccRecipients || []));
        }
        res.json({ ok: true, items });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: "Failed to fetch messages" });
    }
});
// Message detail (HTML-safe body preview)
r.get("/o365/messages/:id", async (req, res) => {
    try {
        const token = await getToken(process.env.O365_SERVICE_USER_ID);
        const j = await graph(token, `/me/messages/${req.params.id}?$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,conversationId,hasAttachments`);
        res.json({ ok: true, item: j });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: "Failed to fetch message" });
    }
});
export default r;
