import { Router } from "express";
import { z } from "zod";
import twilio from "twilio";

const router = Router();

// Fallback initialization if enhanced modules fail
let twilioClient: any;
let assertE164: any;
let enforceProductionSecurity: any;

try {
  const twilioModule = require("../twilio/twilioClient");
  const guardsModule = require("../twilio/guards");
  
  twilioClient = twilioModule.twilioClient;
  assertE164 = guardsModule.assertE164;
  enforceProductionSecurity = guardsModule.enforceProductionSecurity;
} catch {
  // Fallback initialization
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
  } = process.env;

  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  
  assertE164 = (phone: string) => {
    if (!/^\+?[1-9]\d{1,14}$/.test(phone)) {
      throw new Error("Invalid phone (must be E.164)");
    }
  };
  
  enforceProductionSecurity = (phone: string, environment: string = "production") => {
    const isTestNumber = (p: string) =>
      ["+15005550000","+15005550006","+15005550008","+15005550009"].includes(p);
    if (environment === "production" && isTestNumber(phone)) {
      throw new Error("Refusing to send to Twilio test number in production");
    }
  };
}

const {
  TWILIO_CONTENT_SID,
  TWILIO_MESSAGING_SERVICE_SID,
  BF_SMS_FROM_E164,
  BF_WHATSAPP_FROM,
  ENVIRONMENT,
} = process.env as Record<string, string>;

const bodySchema = z.object({
  to: z.string(),                       // E.164 like +1...
  variables: z.record(z.string()).optional(), // { firstName: "Lisa", appId: "..." }
  channel: z.enum(["sms","whatsapp"]).default("sms"),
  templateSid: z.string().optional(),   // Override default template
});

// Send templated message (for status updates, notifications, etc.)
router.post("/send-template", async (req: any, res: any) => {
  try {
    const { to, variables, channel, templateSid } = bodySchema.parse(req.body || {});
    
    assertE164(to);
    enforceProductionSecurity(to, ENVIRONMENT);

    const contentSid = templateSid || TWILIO_CONTENT_SID;
    if (!contentSid) {
      return res.status(400).json({ ok: false, error: "No template SID configured" });
    }

    const addr = channel === "whatsapp" ? `whatsapp:${to}` : to;
    const fromAddress = channel === "whatsapp" ? BF_WHATSAPP_FROM : 
                       (TWILIO_MESSAGING_SERVICE_SID ? undefined : BF_SMS_FROM_E164);

    console.log(`📱 [TEMPLATE] Sending ${channel} template to ${to}`);

    const msg = await twilioClient.messages.create({
      to: addr,
      messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID || undefined,
      from: fromAddress,
      contentSid: contentSid,
      contentVariables: variables ? JSON.stringify(variables) : undefined,
      statusCallback: "/api/twilio/status-callback",
    });

    console.log(`✅ [TEMPLATE] Sent ${channel} message, SID: ${msg.sid}`);
    return res.json({ ok: true, sid: msg.sid, channel });
    
  } catch (error: any) {
    console.error("[TEMPLATE] Send failed:", error instanceof Error ? error.message : String(error));
    return res.status(500).json({ ok: false, error: error?.message || "Template send failed" });
  }
});

// Send simple text message (for ad-hoc communications)
router.post("/send-text", async (req: any, res: any) => {
  try {
    const schema = z.object({
      to: z.string(),
      body: z.string(),
      channel: z.enum(["sms","whatsapp"]).default("sms"),
    });
    
    const { to, body, channel } = schema.parse(req.body || {});
    
    assertE164(to);
    enforceProductionSecurity(to, ENVIRONMENT);

    const addr = channel === "whatsapp" ? `whatsapp:${to}` : to;
    const fromAddress = channel === "whatsapp" ? BF_WHATSAPP_FROM : 
                       (TWILIO_MESSAGING_SERVICE_SID ? undefined : BF_SMS_FROM_E164);

    console.log(`📱 [TEXT] Sending ${channel} text to ${to}`);

    const msg = await twilioClient.messages.create({
      to: addr,
      body: body,
      messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID || undefined,
      from: fromAddress,
      statusCallback: "/api/twilio/status-callback",
    });

    console.log(`✅ [TEXT] Sent ${channel} message, SID: ${msg.sid}`);
    return res.json({ ok: true, sid: msg.sid, channel });
    
  } catch (error: any) {
    console.error("[TEXT] Send failed:", error instanceof Error ? error.message : String(error));
    return res.status(500).json({ ok: false, error: error?.message || "Text send failed" });
  }
});

export default router;