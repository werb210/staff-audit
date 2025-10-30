import { Router } from "express";
const router = Router();
/**
 * POST /api/voice/voicemail   (recordingStatusCallback)
 * Body includes RecordingUrl, From, To, CallSid, etc.
 */
router.post("/voicemail", async (req, res) => {
    try {
        const { RecordingUrl, From, CallSid } = req.body || {};
        console.log("[VOICE] Voicemail received:", { RecordingUrl, From, CallSid });
        // 1) Ensure a contact exists for 'From'
        const contact = await (req.app.locals.db?.contacts?.findByPhone?.(From) ??
            { id: null, name: null });
        let contactId = contact?.id;
        if (!contactId && req.app.locals.db?.contacts?.create) {
            const created = await req.app.locals.db.contacts.create({ phone: From, name: From });
            contactId = created.id;
        }
        // 2) Log voicemail into communications
        await (req.app.locals.db?.communications?.appendMessage?.({
            contactId: contactId ?? "unknown",
            type: "call",
            direction: "inbound",
            at: new Date().toISOString(),
            payload: { kind: "voicemail", RecordingUrl, CallSid },
            text: `Voicemail left: ${RecordingUrl}`
        }) ?? Promise.resolve());
        // 3) Create a follow-up Task
        await (req.app.locals.db?.tasks?.create?.({
            contactId: contactId ?? null,
            title: "Missed call / Voicemail",
            description: `Callback ${From}. Voicemail: ${RecordingUrl}`,
            dueAt: new Date(Date.now() + 3600_000).toISOString(), // in 1h
            priority: "high"
        }) ?? Promise.resolve());
        // 4) Notify client (optional polite SMS) - stub mode safe
        try {
            if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
                const twilio = require('twilio');
                const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                await client.messages.create({
                    to: From,
                    from: process.env.TWILIO_BF_NUMBER || "+18254511768",
                    body: "Thanks for calling Boreal. We missed you but got your voicemail; we'll call you back shortly."
                });
            }
        }
        catch (e) {
            console.log("[VOICE] SMS notification skipped (stub mode):", e?.message);
        }
        // 5) Notify staff via email (stub ok)
        try {
            // Email notification would go here - stub mode safe
            console.log("[VOICE] Email notification would be sent to staff about voicemail from", From);
        }
        catch (e) {
            console.log("[VOICE] Email notification skipped:", e?.message);
        }
        res.json({ ok: true });
    }
    catch (e) {
        console.error("[VOICE] voicemail handler error", e);
        res.json({ ok: true }); // never fail callback
    }
});
/**
 * POST /api/voice/events
 * General call status events
 */
router.post("/events", async (req, res) => {
    try {
        const { CallSid, CallStatus, From, To } = req.body || {};
        console.log("[VOICE] Call event:", { CallSid, CallStatus, From, To });
        // Log call events for debugging and analytics
        await (req.app.locals.db?.communications?.appendMessage?.({
            contactId: From ? `contact-${From.replace(/\D/g, "")}` : "unknown",
            type: "call",
            direction: From?.includes(process.env.TWILIO_SLF_NUMBER || "+17753146801") ? "outbound" : "inbound",
            at: new Date().toISOString(),
            payload: { CallSid, CallStatus, From, To },
            text: `Call ${CallStatus}: ${From} → ${To}`
        }) ?? Promise.resolve());
        res.json({ ok: true });
    }
    catch (e) {
        console.error("[VOICE] events handler error", e);
        res.json({ ok: true }); // never fail callback
    }
});
export default router;
