import express from "express";
import twilio from "twilio";
const { jwt: TwilioJWT } = twilio;
const r = express.Router();
const { TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "", TWILIO_API_KEY = process.env.TWILIO_API_KEY || "", TWILIO_API_SECRET = process.env.TWILIO_API_SECRET || "", TWIML_APP_SID = process.env.TWIML_APP_SID || "", TWILIO_NUMBER = process.env.TWILIO_NUMBER || "+18254511768", PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "http://localhost:5000", } = process.env;
// --- Auth helper (simplified for now) ---
const auth = (req, res, next) => next();
// SSE clients for real-time events
const sseClients = [];
// 1) Access token for JS SDK (browser)
r.post("/voice/token", auth, (req, res) => {
    try {
        const identity = `agent:${req.user?.id || "dev"}`;
        if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET) {
            return res.json({ ok: false, error: "Twilio credentials not configured" });
        }
        const token = new TwilioJWT.AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, { identity });
        const grant = new TwilioJWT.AccessToken.VoiceGrant({
            outgoingApplicationSid: TWIML_APP_SID,
            incomingAllow: true
        });
        token.addGrant(grant);
        res.json({ ok: true, identity, token: token.toJwt() });
    }
    catch (error) {
        console.error('Voice token error:', error);
        res.status(500).json({ ok: false, error: 'Token generation failed' });
    }
});
// 2) Browser-initiated outbound (Device.connect → /outbound)
r.post("/voice/outbound", auth, (req, res) => {
    try {
        res.set("Content-Type", "text/xml");
        const twiml = new twilio.twiml.VoiceResponse();
        const dial = twiml.dial({ callerId: TWILIO_NUMBER });
        dial.number({
            statusCallback: `${PUBLIC_BASE_URL}/api/voice/events`,
            statusCallbackEvent: ["initiated", "ringing", "answered", "completed"]
        }, req.body.To);
        if (req.body.contactEmail) {
            twiml.say({ voice: "alice" }, `Calling contact ${req.body.contactEmail}`);
        }
        res.send(twiml.toString());
    }
    catch (error) {
        console.error('Outbound call error:', error);
        res.status(500).send('Error processing outbound call');
    }
});
// 3) Inbound: phone number → ring browser client(s)
r.post("/voice/incoming", (req, res) => {
    try {
        res.set("Content-Type", "text/xml");
        const twiml = new twilio.twiml.VoiceResponse();
        const dial = twiml.dial({ answerOnBridge: true });
        dial.client("agent"); // matches identity prefix
        res.send(twiml.toString());
    }
    catch (error) {
        console.error('Incoming call error:', error);
        res.status(500).send('Error processing incoming call');
    }
});
// 4) SSE endpoint for real-time events
r.get("/voice/sse", auth, (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
    });
    res.write("\n");
    sseClients.push(res);
    req.on("close", () => {
        const index = sseClients.indexOf(res);
        if (index >= 0)
            sseClients.splice(index, 1);
    });
});
// 5) Status webhooks → fan out to UI via SSE
r.post("/voice/events", (req, res) => {
    const payload = { type: "voice:event", data: req.body };
    sseClients.forEach(client => {
        try {
            client.write(`event: voice\ndata: ${JSON.stringify(payload)}\n\n`);
        }
        catch (e) { }
    });
    res.json({ ok: true });
});
// 6) (Dev only) Simulate inbound ring to pop dialer
r.post("/voice/simulate", auth, (req, res) => {
    const payload = {
        type: "voice:ring",
        data: { from: req.body.from || "+15555551234" }
    };
    sseClients.forEach(client => {
        try {
            client.write(`event: voice\ndata: ${JSON.stringify(payload)}\n\n`);
        }
        catch (e) { }
    });
    res.json({ ok: true });
});
export default r;
