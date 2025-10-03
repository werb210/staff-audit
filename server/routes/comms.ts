import express from "express";

const router = express.Router();

// Skip auth for development mode
router.use((req: any, res: any, next: any) => {
  console.log(`[COMMS-DEBUG] ${req.method} ${req.path} - NODE_ENV=${process.env.NODE_ENV}`);
  // Always enable dev mode in non-production
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    // In dev mode, skip auth and add a mock user
    req.user = { sub: 'dev-user', email: 'dev@example.com', claims: { sub: 'dev-user' } };
    console.log(`[COMMS-DEBUG] Added dev user to request`);
  }
  next();
});

// ---- helpers ----
function ok(res: express.Response, data: any = {}) { return res.json({ ok: true, ...data }); }
function bad(res: express.Response, code = 400, error = "Bad Request") { return res.status(code).json({ ok: false, error }); }

const DEV = process.env.NODE_ENV !== "production";

// ----- SMS -----
router.post("/sms/send", async (req: any, res: any) => {
  const { to, body, contactId } = req.body || {};
  if (!to || !body) return bad(res, 400, "to and body required");

  try {
    if (DEV || !process.env.TWILIO_AUTH_TOKEN) {
      console.log("[SMS][DEV]", { to, body, contactId });
      return ok(res, { id: `dev_${Date.now()}` });
    }

    const twilio = (await import("twilio")).default(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    const msg = await twilio.messages.create({
      to,
      from: process.env.TWILIO_NUMBER!,
      body,
    });

    return ok(res, { id: msg.sid });
  } catch (e: any) {
    console.error("[SMS] send failed", e);
    return bad(res, 500, e?.message || "SMS send failed");
  }
});

// ----- Email -----
router.post("/email/send", async (req: any, res: any) => {
  const { to, subject, text, html } = req.body || {};
  if (!to || !subject || (!text && !html)) return bad(res, 400, "to, subject and text|html required");

  try {
    if (DEV || !process.env.SENDGRID_API_KEY) {
      console.log("[EMAIL][DEV]", { to, subject, text: text?.slice(0, 120), html: html?.slice(0, 120) });
      return ok(res, { id: `dev_${Date.now()}` });
    }

    const sg = await import("@sendgrid/mail");
    sg.setApiKey(process.env.SENDGRID_API_KEY!);

    const [resp] = await sg.send({
      to,
      from: process.env.SENDGRID_FROM || "no-reply@yourdomain.com",
      subject,
      text,
      html,
    });

    return ok(res, { id: resp.headers["x-message-id"] || `sg_${Date.now()}` });
  } catch (e: any) {
    console.error("[EMAIL] send failed", e);
    return bad(res, 500, e?.message || "Email send failed");
  }
});

// ----- Voicemail list (return dev data in dev mode) -----
router.get("/voice/mailbox/messages", async (_req, res) => {
  if (DEV) {
    console.log("[VOICEMAIL][DEV] Returning dev voicemail data");
    return ok(res, { 
      messages: [
        { id: "vm_1", from: "+15551234567", duration: 30, transcript: "Hello, this is a test voicemail", timestamp: new Date().toISOString() }
      ]
    });
  }
  // Your real implementation may auth-check; if unauthorized, return shape the UI can render.
  return res.status(401).json({ ok: false, error: "NO_TOKEN", messages: [] });
});

export default router;