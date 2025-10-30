import { Router } from "express";
import twilio from "twilio";
import { generateVoiceToken } from "../services/twilioService";
import { TELEPHONY } from "../config/telephony";
const router = Router();
// Health check endpoint
router.get("/health", async (req, res) => {
    try {
        const config = TELEPHONY.BF;
        const client = twilio(config.apiKeySid, config.apiKeySecret, {
            accountSid: config.accountSid,
        });
        const verify = await client.verify.v2.services(config.verifyServiceSid).fetch();
        return res.json({
            ok: true,
            account: config.accountSid,
            applicationSid: config.twimlAppSid,
            verifySid: config.verifyServiceSid,
            verifyName: verify.friendlyName,
        });
    }
    catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
});
// Voice token endpoint (BF-only)
router.get("/token", async (req, res) => {
    try {
        const identity = req.query.identity || `staff-${Date.now()}`;
        const token = generateVoiceToken(identity);
        res.json({ ok: true, token });
    }
    catch (err) {
        console.error("[Twilio] Token error", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});
// Config endpoint for settings UI
router.get("/config", (req, res) => {
    res.json({
        ok: true,
        configured: !!process.env.TWILIO_ACCOUNT_SID,
        accountSid: process.env.TWILIO_ACCOUNT_SID?.substring(0, 8) + "..." || null,
        appSid: process.env.TWILIO_TWIML_APP_SID?.substring(0, 8) + "..." || null,
        phoneNumber: TELEPHONY.BF.phoneNumber,
        lastTested: null
    });
});
// Outbound voice handler (staff dialer places call → Twilio requests instructions here)
router.post("/voice", (req, res) => {
    try {
        const twiml = new twilio.twiml.VoiceResponse();
        // Dial BF main number with proper caller ID
        const dial = twiml.dial({
            callerId: TELEPHONY.BF.phoneNumber
        });
        dial.number(TELEPHONY.BF.phoneNumber);
        res.type("text/xml");
        res.send(twiml.toString());
    }
    catch (err) {
        console.error("[TwilioVoice] Error generating outbound TwiML", err);
        res.status(500).send("<Response><Say>Error handling call</Say></Response>");
    }
});
// Inbound voice handler (customers call Twilio number → routes to staff dialer)
router.post("/voice/incoming", (req, res) => {
    try {
        const twiml = new twilio.twiml.VoiceResponse();
        // Connect incoming call to staff dialer client
        const dial = twiml.dial();
        dial.client("staff"); // route to logged-in Twilio Client identity
        res.type("text/xml");
        res.send(twiml.toString());
    }
    catch (err) {
        console.error("[TwilioVoice] Error generating inbound TwiML", err);
        res.status(500).send("<Response><Say>Error handling incoming call</Say></Response>");
    }
});
export default router;
