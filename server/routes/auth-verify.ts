import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";

import twilio from "twilio";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const verifyServiceSid = process.env.TWILIO_VERIFY_SID!;
if (!verifyServiceSid) {
  console.warn("TWILIO_VERIFY_SID not set - MFA verification will be disabled");
}

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,            // 10 minutes
  max: 20,                              // 20 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
});

const StartSchema = z.object({
  phone: z.string().min(7).max(20),     // E.164 format from client
  channel: z.enum(["sms", "call"]).default("sms"),
});

const CheckSchema = z.object({
  phone: z.string().min(7).max(20),
  code: z.string().min(4).max(10),
});

// Import auth middleware - adjust path as needed
function requireAuth(req: any, res: any, next: any) {
  if (!req.user) return res.sendStatus(401);
  next();
}

export function mountVerifyRoutes(app: any) {
  app.post("/api/auth/verify/start", limiter, requireAuth, async (req: Request, res: Response) => {
    try {
      const { phone, channel } = StartSchema.parse(req.body);
      
      if (!verifyServiceSid) {
        return res.status(503).json({ ok: false, error: "Verification service not configured" });
      }
      
      await twilioClient.verify.v2.services(verifyServiceSid).verifications.create({ 
        to: phone, 
        channel 
      });
      
      res.json({ ok: true });
    } catch (error: unknown) {
      console.error("Verify start error:", error);
      res.status(400).json({ ok: false, error: "Failed to send verification code" });
    }
  });

  app.post("/api/auth/verify/check", limiter, requireAuth, async (req: Request, res: Response) => {
    try {
      const { phone, code } = CheckSchema.parse(req.body);

      // DEV-only bypass for local testing
      if (process.env.NODE_ENV !== "production" && code === "000000") {
        req.session.mfaVerified = true;
        req.session.mfaVerifiedAt = Date.now();
        return res.json({ ok: true, bypass: true });
      }

      if (!verifyServiceSid) {
        return res.status(503).json({ ok: false, error: "Verification service not configured" });
      }

      const result = await twilioClient.verify.v2.services(verifyServiceSid).verificationChecks.create({ 
        to: phone, 
        code 
      });
      
      if (result.status === "approved") {
        req.session.mfaVerified = true;
        req.session.mfaVerifiedAt = Date.now();
        return res.json({ ok: true });
      }
      
      return res.status(400).json({ ok: false, error: "Invalid verification code" });
    } catch (error: unknown) {
      console.error("Verify check error:", error);
      res.status(400).json({ ok: false, error: "Verification failed" });
    }
  });

  // For the client to know whether to gate content
  app.get("/api/auth/verify/status", requireAuth, (req: Request, res: Response) => {
    res.json({
      mfaRequired: !!(req.user as any)?.mfaRequired,
      mfaVerified: !!req.session?.mfaVerified,
      mfaVerifiedAt: req.session?.mfaVerifiedAt ?? null,
    });
  });
}

// Enhanced admin guard with MFA requirement
export function requireAdminWithMfa(req: any, res: any, next: any) {
  if (!req.user) return res.sendStatus(401);
  if (!req.user.roles?.includes("admin")) return res.sendStatus(403);
  
  // Require step-up MFA if user is flagged
  if (req.user.mfaRequired && !req.session?.mfaVerified) {
    return res.status(428).json({ mfa: "required" }); // 428 Precondition Required
  }
  
  // Optional: expire MFA verification after 15 minutes
  const MFA_TTL = 15 * 60 * 1000; // 15 minutes
  if (req.session?.mfaVerifiedAt && Date.now() - req.session.mfaVerifiedAt > MFA_TTL) {
    req.session.mfaVerified = false;
    return res.status(428).json({ mfa: "expired" });
  }
  
  next();
}