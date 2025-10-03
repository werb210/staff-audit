import { Router } from "express";
import type { Request, Response } from "express";

const r = Router();

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`[voice] Missing env: ${name}`);
  return v;
}

// ----- Simple in-memory SSE hub keyed by tenant -----
type Tenant = "bf" | "slf";
type Client = { id: string; res: Response; tenant: Tenant };
const clients = new Map<string, Client>();

function send(ev: { type: string; payload: any }, res: Response) {
  res.write(`data: ${JSON.stringify(ev)}\n\n`);
}

function broadcast(tenant: Tenant, ev: { type: string; payload: any }) {
  for (const c of clients.values()) if (c.tenant === tenant) send(ev, c.res);
}

// Keepalive
setInterval(() => {
  for (const c of clients.values()) try { c.res.write(`:ka\n\n`); } catch {}
}, 25000);

// ----- SSE endpoint -----
r.get("/sse", (req: Request, res: Response) => {
  const tenant = (String(req.query.tenant || "bf").toLowerCase() === "slf" ? "slf" : "bf") as Tenant;
  const id = `${tenant}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  clients.set(id, { id, res, tenant });
  send({ type: "ready", payload: { id, tenant } }, res);

  req.on("close", () => { clients.delete(id); });
});

/**
 * GET /api/voice/token?silo=BF|SLF
 * Issues a short-lived Voice access token for the Twilio JS SDK (Twilio.Device).
 * Supports silo-aware token generation with separate Twilio credentials per silo.
 */
r.get("/token", async (req: any, res: any) => {
  try {
    // Lazy import twilio for compatibility
    const twilio = (await import("twilio")).default;
    
    // Get silo from query parameter - support both BF/SLF naming conventions
    const silo = String(req.query.silo || "BF").toUpperCase();
    const isSlf = silo === "SLF";
    
    // New naming convention from patches
    const accountSid = isSlf ? process.env.TWILIO_SLF_ACCOUNT_SID : process.env.TWILIO_BF_ACCOUNT_SID;
    const apiKey = isSlf ? process.env.TWILIO_SLF_API_KEY_SID : process.env.TWILIO_BF_API_KEY_SID;
    const apiSecret = isSlf ? process.env.TWILIO_SLF_API_KEY_SECRET : process.env.TWILIO_BF_API_KEY_SECRET;
    const appSid = isSlf ? process.env.TWILIO_SLF_TWIML_APP_SID : process.env.TWILIO_BF_TWIML_APP_SID;
    const callerId = isSlf ? process.env.TWILIO_SLF_CALLER_ID : process.env.TWILIO_BF_CALLER_ID;
    
    // Fallback to old naming convention if new one not available
    const fallbackAccountSid = process.env[`TWILIO_ACCOUNT_SID_${silo}`] || process.env.TWILIO_ACCOUNT_SID;
    const fallbackApiKey = process.env[`TWILIO_API_KEY_${silo}`] || process.env.TWILIO_API_KEY_SID || accountSid || fallbackAccountSid;
    const fallbackApiSecret = process.env[`TWILIO_API_SECRET_${silo}`] || process.env.TWILIO_API_KEY_SECRET || process.env.TWILIO_AUTH_TOKEN;
    const fallbackAppSid = process.env[`TWIML_APP_SID_${silo}`] || process.env.TWILIO_TWIML_APP_SID;

    const finalAccountSid = accountSid || fallbackAccountSid;
    const finalApiKey = apiKey || fallbackApiKey;
    const finalApiSecret = apiSecret || fallbackApiSecret;
    const finalAppSid = appSid || fallbackAppSid;

    if (!finalAccountSid || !finalApiKey || !finalApiSecret || !finalAppSid) {
      return res.status(500).json({ ok: false, error: "Twilio not configured", silo });
    }

    // Identity can be your staff user email or a stable UUID.
    const identity = String(req.query.identity || (req as any)?.user?.id || "staff-anon");

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: finalAppSid,
      incomingAllow: true,
    });

    const token = new AccessToken(finalAccountSid, finalApiKey, finalApiSecret, {
      identity,
      ttl: 3600, // 1 hour
    });
    token.addGrant(voiceGrant);

    const response = {
      ok: true,
      identity,
      token: token.toJwt(),
      appSid: finalAppSid,
      callerId: callerId || process.env[`TWILIO_PHONE_NUMBER_${silo}`] || process.env.TWILIO_CALLER_ID || process.env.TWILIO_PHONE_NUMBER || null,
      silo: silo,
    };
    
    console.log(`✅ [VOICE-TOKEN] Token issued for ${silo} silo, identity: ${identity}`);
    res.json(response);
  } catch (e: any) {
    console.error(`[VOICE-TOKEN] Error for silo ${req.query.silo}:`, e?.message);
    res.status(500).json({ ok: false, error: e?.message || "token_error" });
  }
});

// ----- Simulate inbound call (for auto-slide testing) -----
r.post("/simulate", (req: Request, res: Response) => {
  const body = req.body || {};
  const tenant = (String(body.tenant || "bf").toLowerCase() === "slf" ? "slf" : "bf") as Tenant;
  const from = String(body.from || "+15555550123");
  const sid = `TEST-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

  broadcast(tenant, { type: "incoming_call", payload: { sid, from, tenant, at: Date.now() } });
  res.json({ ok: true, sid, tenant });
});

// ----- Outbound call (Twilio-ready; works in test mode) -----
r.post("/outgoing", async (req: Request, res: Response) => {
  console.log('📞 [VOICE] Outgoing call request:', req.body);
  const { to = "+15555550123", from = "+15555550999" } = req.body || {};

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;
  const twilioReady = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);

  if (!twilioReady) {
    console.log('🧪 [VOICE] Test mode - Twilio credentials not configured');
    return res.json({ 
      ok: true, 
      sid: `TEST-${Date.now().toString(36)}`, 
      to, 
      from: TWILIO_PHONE_NUMBER || from, 
      twilio: false,
      status: 'simulated'
    });
  }

  // Live Twilio: lazy import so dev env doesn't require package
  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    // Phone number validation and formatting
    console.log('📞 [VOICE-OUTGOING] Call request received:', { to, contactId: req.body.contactId, contactName: req.body.contactName });
    
    // Validate North American phone number format (US/Canada)
    if (!/^\+1[0-9]{10}$/.test(to)) {
      console.error('❌ [VOICE-OUTGOING] Invalid phone number format:', to);
      return res.status(400).json({
        ok: false,
        error: 'Invalid phone number format. Must be +1XXXXXXXXXX (North American format)',
        provided: to
      });
    }

    // Canadian area codes (including 587 for Alberta)
    const areaCode = to.substring(2, 5);
    const isCanadian = ['587', '780', '403', '825', '604', '778', '236', '250', '867', '416', '647', '437', '905', '289', '365', '519', '548', '226', '519', '613', '343', '807', '705', '249', '705', '506', '709', '902', '782'].includes(areaCode);
    
    console.log(`📞 [VOICE-OUTGOING] Area code ${areaCode} - ${isCanadian ? 'CANADIAN' : 'US'} number detected`);

    console.log('📞 [VOICE-OUTGOING] Initiating call:', `${TWILIO_PHONE_NUMBER} -> ${to}`);

    console.log(`📞 [VOICE] Making outbound call: ${TWILIO_PHONE_NUMBER} -> ${to}`);
    
    const call = await client.calls.create({
      to, 
      from: TWILIO_PHONE_NUMBER,
      machineDetection: "DetectMessageEnd",
      // Simple TwiML without webhook loops
      twiml: `<Response><Say voice="alice">This is a test call from Boreal Financial. Thank you.</Say><Hangup/></Response>`
    });
    
    console.log(`✅ [VOICE] Call initiated successfully: ${call.sid}`);
    return res.json({ ok: true, sid: call.sid, to, from: TWILIO_PHONE_NUMBER, twilio: true, status: 'initiated' });
    
  } catch (err: any) {
    console.error('❌ [VOICE] Call failed:', err.message);
    return res.status(500).json({ ok: false, error: err?.message || "twilio_error" });
  }
});

// TwiML for outbound calls with Canadian support
r.post("/twiml-outbound", (req: any, res: any) => {
  const { to, isCanadian } = req.query;
  const greeting = isCanadian === 'true' 
    ? "This call is from Boreal Financial in Canada. Please hold while we connect you."
    : "This call is from Boreal Financial. Please hold while we connect you.";
    
  res.type("text/xml").send(`
    <Response>
      <Say voice="alice" language="en-US">${greeting}</Say>
      <Pause length="1"/>
      <Say voice="alice">Connecting now...</Say>
    </Response>
  `);
});

// Call status callback handler
r.post("/status-callback", (req: any, res: any) => {
  const { CallSid, CallStatus, To, From } = req.body;
  console.log(`📞 [VOICE-STATUS] Call ${CallSid}: ${CallStatus} (${From} -> ${To})`);
  
  // Log call status for Canadian numbers
  const areaCode = To?.substring(2, 5);
  if (['587', '780', '403', '825'].includes(areaCode)) {
    console.log(`🍁 [CANADIAN-CALL] Alberta call ${CallSid}: ${CallStatus}`);
  }
  
  res.sendStatus(200);
});

// Simple TwiML test endpoint
r.post("/twiml", (_req, res) => {
  res.type("text/xml").send(`<Response><Say voice="alice">Boreal Financial calling system is operational.</Say></Response>`);
});

// IVR test endpoint for smoke tests
r.post("/ivr/test", (_req, res) => {
  console.log('📞 [VOICE-IVR] Test endpoint called');
  res.json({ ok: true, message: 'IVR system operational' });
});

// New E2E endpoints from patches
// POST /api/voice/call  { to:"+15551234567", silo:"BF" }
r.post("/call", async (req: Request, res: Response) => {
  try {
    const silo = String(req.query.silo || req.body?.silo || "BF").toUpperCase();
    const isSlf = silo === "SLF";
    
    const accountSid = isSlf ? process.env.TWILIO_SLF_ACCOUNT_SID : process.env.TWILIO_BF_ACCOUNT_SID;
    const apiKey = isSlf ? process.env.TWILIO_SLF_API_KEY_SID : process.env.TWILIO_BF_API_KEY_SID;
    const apiSecret = isSlf ? process.env.TWILIO_SLF_API_KEY_SECRET : process.env.TWILIO_BF_API_KEY_SECRET;
    const callerId = isSlf ? process.env.TWILIO_SLF_CALLER_ID : process.env.TWILIO_BF_CALLER_ID;
    
    if (!accountSid || !apiKey || !apiSecret || !callerId) {
      return res.status(500).json({ ok: false, error: "Twilio not configured for silo " + silo });
    }
    
    const twilio = (await import("twilio")).default;
    const client = twilio(apiKey, apiSecret, { accountSid });
    const to = String(req.body.to || "");
    if (!to) return res.status(400).json({ ok: false, error: "Missing 'to' number" });

    const call = await client.calls.create({
      to,
      from: callerId,
      url: `${process.env.PUBLIC_URL || req.protocol + "://" + req.get("host")}/api/voice/twiml/outbound?silo=${silo}`,
      statusCallback: `${process.env.PUBLIC_URL || req.protocol + "://" + req.get("host")}/api/voice/status?silo=${silo}`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      machineDetection: "Enable",
    });
    res.json({ ok: true, callSid: call.sid, silo });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST from Twilio (incoming call -> return TwiML)
r.post("/incoming", (req: Request, res: Response) => {
  const silo = String(req.query.silo || req.body?.silo || "BF").toUpperCase();
  const twilio = require("twilio");
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say({ voice: "alice" }, `Connecting you. Silo ${silo}.`);
  // Route to a <Client> (web dialer) named 'staff-queue' so browser clients can answer
  const dial = twiml.dial();
  dial.client({}, "staff-queue");
  res.set("Content-Type", "text/xml").send(twiml.toString());
});

// TwiML for programmatic outbound from our POST /voice/call
r.get("/twiml/outbound", (req: Request, res: Response) => {
  const to = String(req.query.to || req.body?.to || "");
  const twilio = require("twilio");
  const twiml = new twilio.twiml.VoiceResponse();
  if (to) {
    const dial = twiml.dial();
    dial.number({}, to);
  } else {
    twiml.say("No destination.");
  }
  res.set("Content-Type", "text/xml").send(twiml.toString());
});

// Enhanced status callback (attach to contact/app later)
r.post("/status", (req: Request, res: Response) => {
  const silo = String(req.query.silo || req.body?.silo || "BF").toUpperCase();
  // minimally log; you likely persist to 'calls' table
  console.log("[VOICE] status", {
    silo,
    CallSid: req.body.CallSid,
    CallStatus: req.body.CallStatus,
    To: req.body.To,
    From: req.body.From,
    RecordingUrl: req.body.RecordingUrl,
  });
  res.json({ ok: true });
});

export default r;