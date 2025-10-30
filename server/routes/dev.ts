import { Router } from "express";
const router = Router();

/** POST /api/dev/impersonate  { role, email?, lenderId? }  (DEV_AUTH only) */
router.post("/impersonate", (req: any, res: any) => {
  if (process.env.DEV_AUTH !== "1") return res.status(403).json({ error: "forbidden" });
  const { role, email, lenderId } = req.body || {};
  if (!role) return res.status(400).json({ error: "missing_role" });
  const payload = JSON.stringify({ role, email, lenderId });
  res.cookie("dev_impersonate", payload, {
    httpOnly: false, // readable by client to show current role
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 7 * 24 * 3600 * 1000
  });
  res.json({ ok: true, role, email, lenderId });
});

/** POST /api/dev/impersonate/clear */
router.post("/impersonate/clear", (req: any, res: any) => {
  if (process.env.DEV_AUTH !== "1") return res.status(403).json({ error: "forbidden" });
  res.clearCookie("dev_impersonate", { path: "/" });
  res.json({ ok: true });
});

/** GET /api/dev/env-dump - Masked env dump for migration debugging */
router.get("/env-dump", (req: any, res: any) => {
  const mask = (val?: string) => val ? val.slice(0, 6) + "..." : "MISSING";
  res.json({
    TWILIO_ACCOUNT_SID: mask(process.env.TWILIO_ACCOUNT_SID),
    TWILIO_API_KEY_SID: mask(process.env.TWILIO_API_KEY_SID),
    TWILIO_TWIML_APP_SID: mask(process.env.TWILIO_TWIML_APP_SID),
    TWILIO_VERIFY_SERVICE_SID: mask(process.env.TWILIO_VERIFY_SERVICE_SID),
    Azure_BUCKET: process.env.Azure_BUCKET || "MISSING",
  });
});

export default router;