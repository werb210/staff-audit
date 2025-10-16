// server/routes/integrations/office365.ts
import { Router } from "express";
import { z } from "zod";
import office365 from "../../services/office365Service";
import { requireJwt } from "../../mw/jwt-auth";

const r = Router();
const uid = (req: any) => req.user?.id || "anon";

// Start OAuth: returns auth URL
r.get("/connect", requireJwt, async (req, res) => {
  if (!office365.hasCredentials()) return res.status(500).json({ ok: false, message: "O365 not configured" });
  const state = Buffer.from(JSON.stringify({ uid: uid(req) })).toString("base64url");
  const url = await office365.getAuthUrl(state);
  res.json({ ok: true, url });
});

// OAuth redirect URI
r.get("/callback", async (req, res) => {
  try {
    const qp = z.object({ code: z.string(), state: z.string().optional() }).parse(req.query);
    const state = qp.state ? JSON.parse(Buffer.from(qp.state, "base64url").toString("utf8")) : {};
    const userId = state?.uid || "anon";
    await office365.exchangeCodeForToken({ code: qp.code, userId });
    res.type("html").send("<script>window.close&&window.close()</script>Connected. You can close this window.");
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || "oauth_error" });
  }
});

// Status
r.get("/status", requireJwt, async (req, res) => {
  res.json(await office365.status(uid(req)));
});

// Mail
r.post("/sendmail", requireJwt, async (req, res) => {
  const body = z.object({
    to: z.union([z.string().email(), z.array(z.string().email()).nonempty()]),
    subject: z.string().min(1),
    html: z.string().optional(),
    text: z.string().optional(),
  }).parse(req.body);
  await office365.sendMail(uid(req), body);
  res.json({ ok: true });
});

r.get("/messages", requireJwt, async (req, res) => {
  const top = Number(req.query.top ?? 25);
  res.json(await office365.listMessages(uid(req), top));
});

// Contacts
r.get("/contacts", requireJwt, async (req, res) => {
  res.json(await office365.listContacts(uid(req)));
});

// Calendar
r.get("/events", requireJwt, async (req, res) => {
  const start = req.query.start as string | undefined;
  const end = req.query.end as string | undefined;
  res.json(await office365.listEvents(uid(req), { start, end }));
});

r.post("/events", requireJwt, async (req, res) => {
  const schema = z.object({
    subject: z.string().min(1),
    body: z.object({ contentType: z.enum(["HTML", "Text"]).optional(), content: z.string().optional() }).optional(),
    start: z.object({ dateTime: z.string(), timeZone: z.string().optional() }),
    end: z.object({ dateTime: z.string(), timeZone: z.string().optional() }),
    attendees: z.array(z.object({
      emailAddress: z.object({ address: z.string().email(), name: z.string().optional() }),
      type: z.enum(["required", "optional"]).optional(),
    })).optional(),
    location: z.object({ displayName: z.string() }).optional(),
  });
  const input = schema.parse(req.body);
  res.json(await office365.createEvent(uid(req), input));
});

// Disconnect
r.post("/disconnect", requireJwt, async (req, res) => {
  await office365.revoke(uid(req));
  res.json({ ok: true });
});

export default r;
