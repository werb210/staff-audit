import { Router } from "express";
const router = Router();
/** POST /api/voice/transcript
 * Expected body: { CallSid, From, ContactId?, Transcript }
 */
router.post("/voice/transcript", async (req, res) => {
    try {
        const { CallSid, From, ContactId, Transcript } = req.body || {};
        const row = { id: "tr-" + Date.now(), callSid: CallSid, contactId: ContactId ?? null, text: Transcript ?? "", at: new Date().toISOString() };
        await (req.app.locals.db.transcripts.add(row));
        // also append to comms log for visibility
        await (req.app.locals.db.communications?.appendMessage?.({
            contactId: ContactId ?? "unknown",
            type: "call",
            direction: "inbound",
            at: row.at,
            text: `Transcript snippet: ${row.text.slice(0, 120)}…`,
            payload: { kind: "transcript", CallSid }
        }) ?? Promise.resolve());
        res.json({ ok: true });
    }
    catch (e) {
        console.error("[TRANSCRIPT] error", e);
        res.json({ ok: true });
    }
});
/** POST /api/search { q, contactId? } */
router.post("/search", async (req, res) => {
    const { q, contactId } = req.body || {};
    if (!q)
        return res.status(400).json({ error: "missing_q" });
    // fetch comms for scope (shim: reuse messages API if available)
    let comms = [];
    try {
        // call in-process if you have a function; else leave empty
    }
    catch { }
    const result = require("../db/transcripts-shim").searchAll(q, comms);
    res.json(result);
});
export default router;
