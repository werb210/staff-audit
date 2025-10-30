import { Router } from "express";
import { DB, addMeeting } from "../lib/db";
import { getAvailability } from "./engine";
const router = Router();
router.get("/staff/:id/booking-link", (req, res) => {
    const u = DB.users.get(String(req.params.id));
    if (!u)
        return res.status(404).json({ error: "no_user" });
    const url = `${process.env.PUBLIC_BASE || "https://staff.boreal.financial"}/book/${u.username}`;
    res.json({ url });
});
router.get("/booking/:username/availability", (req, res) => {
    const username = String(req.params.username);
    const from = String(req.query.from || new Date().toISOString());
    const days = Number(req.query.days || 21);
    res.json({ username, availability: getAvailability(username, from, days) });
});
// Public booking: anyone with the link can book the host's time
router.post("/booking/:username/book", async (req, res) => {
    try {
        const { username } = req.params;
        const { contactEmail, contactName, slotStartUtc, slotEndUtc, notes } = req.body || {};
        const user = [...DB.users.values()].find(u => u.username === username);
        if (!user)
            return res.status(404).json({ error: "no_user" });
        if (!contactEmail || !slotStartUtc || !slotEndUtc)
            return res.status(400).json({ error: "missing_fields" });
        // For demo: create meeting without MS Graph integration
        // When ready, uncomment MS Graph code below
        /*
        if(!user.msRefreshToken) return res.status(409).json({error:"host_not_connected_ms"});
        const token = await refreshWithRefreshToken(user.msRefreshToken);
        const eventBody = {
          subject: `Meeting with ${contactName||contactEmail}`,
          body: { contentType:"HTML", content: (notes||"") },
          start: { dateTime: slotStartUtc, timeZone: "UTC" },
          end:   { dateTime: slotEndUtc,   timeZone: "UTC" },
          attendees: [ { emailAddress: { address: contactEmail, name: contactName||contactEmail }, type:"required" } ],
          isOnlineMeeting: true, onlineMeetingProvider: "teamsForBusiness"
        };
        const ev = await createEvent(token.access_token, eventBody);
        */
        const meeting = addMeeting(user.id, {
            hostUserId: user.id,
            contactEmail,
            startUtc: slotStartUtc,
            endUtc: slotEndUtc,
            externalId: "demo-" + Date.now()
        });
        return res.json({ ok: true, meetingId: meeting.id, message: "Meeting booked successfully!" });
    }
    catch (e) {
        return res.status(500).json({ error: "book_failed", detail: String(e?.message || e) });
    }
});
export default router;
