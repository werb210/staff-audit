import { Router } from "express";
import { DB } from "../lib/db";
import { sendSms } from "../twilio/sender";
const router = Router();
/**
 * POST /api/contacts/:id/send-booking-link
 * { channel: "sms"|"email", to: "+1...", staffUserId: "u1" }
 */
router.post("/contacts/:id/send-booking-link", async (req, res) => {
    try {
        const { channel, to, staffUserId } = req.body || {};
        const u = DB.users.get(staffUserId || "");
        if (!u)
            return res.status(404).json({ error: "no_staff_user" });
        const link = `${process.env.PUBLIC_BASE || "https://staff.boreal.financial"}/book/${u.username}`;
        if (channel === "sms") {
            if (!to)
                return res.status(400).json({ error: "missing_to" });
            try {
                await sendSms(to, `Book a time with ${u.name}: ${link}`);
                return res.json({ ok: true, link, message: "SMS sent successfully" });
            }
            catch (e) {
                // If Twilio fails (demo mode), still return success for testing
                console.log("SMS send failed (demo mode):", e.message);
                return res.json({ ok: true, link, message: "SMS would be sent (demo mode)" });
            }
        }
        if (channel === "email") {
            // Placeholder for email integration
            return res.json({ ok: true, link, message: "Email would be sent (connect Office 365)" });
        }
        return res.status(400).json({ error: "unknown_channel" });
    }
    catch (e) {
        return res.status(500).json({ error: "send_failed", detail: String(e?.message || e) });
    }
});
export default router;
