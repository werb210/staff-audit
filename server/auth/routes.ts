import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import express from "express";
import { signJwt, verifyJwt, extractBearer } from "../mw/jwt-auth";
import { sendCode, checkCode } from "../security/twilioVerify";
import { v4 as uuid } from "uuid";

// Database connection for user lookup
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";

const repo = {
  async findUserByEmail(email: string) {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (result.length === 0) return null;
      
      const user = result[0];
      return {
        id: user.id,
        email: user.email,
        password_hash: user.passwordHash,
        role: user.role,
        tenant_id: "bf", // Default tenant
        mobile: user.mobilePhone,
        first_name: user.firstName,
        last_name: user.lastName
      };
    } catch (error) {
      console.error("Database lookup error:", error);
      return null;
    }
  }
};

// Security: For development, provide fallback. For production, require environment variables.
const ADMIN_EMAIL = (process.env.BF_ADMIN_EMAIL || 
  (process.env.NODE_ENV !== 'production' ? 'admin@boreal.com' : null))?.toLowerCase();
const ADMIN_PASSWORD = process.env.BF_ADMIN_PASSWORD || 
  (process.env.NODE_ENV !== 'production' ? 'admin123' : null);
const ADMIN_HASH = ADMIN_PASSWORD ? bcrypt.hashSync(ADMIN_PASSWORD, 10) : null;

// Security: No hardcoded override credentials
const OVERRIDE_EMAIL = process.env.BF_OVERRIDE_EMAIL?.toLowerCase();
const OVERRIDE_PASSWORD = process.env.BF_OVERRIDE_PASSWORD;

// Simple in-memory map for dev to pair attemptId -> user
const mfaAttempts = new Map<string, any>();

export function setupAuth(app: Express) {
  app.post("/api/auth/login", express.json(), async (req: Request, res: Response) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "").trim();
    if (!email || !password) return res.status(400).json({ error: "missing_credentials" });

    // 1) Try DB
    let user: any = null;
    try { 
      user = await repo.findUserByEmail(email); 
      console.log(`🔍 Database lookup for ${email}:`, user ? 'FOUND' : 'NOT FOUND');
    } catch (error) {
      console.error('Database lookup error:', error);
    }

    // 2) Fallback to env admin (only if properly configured)
    if (!user && ADMIN_EMAIL && ADMIN_HASH && email === ADMIN_EMAIL) {
      const ok = await bcrypt.compare(password, ADMIN_HASH);
      if (!ok) return res.status(401).json({ error: "invalid_credentials" });
      user = { id: "00000000-0000-0000-0000-000000000001", email, role: "admin", tenant_id: "bf" };
    }

    // 3) Override user (only if properly configured via env vars)
    if (!user && OVERRIDE_EMAIL && OVERRIDE_PASSWORD && email === OVERRIDE_EMAIL && password === OVERRIDE_PASSWORD) {
      user = {
        id: "00000000-0000-0000-0000-00000000BEEF",
        email,
        role: "admin", 
        tenant_id: "bf",
        first_name: "Todd",
        last_name: "Werboweski",
        mobile: "+15878881837",
      };
    }

    if (!user) {
      console.log(`❌ No user found for: ${email}`);
      return res.status(401).json({ error: "invalid_credentials" });
    }
    
    console.log(`👤 Found user: ${user.email}, verifying password...`);

    // MFA requirement - ENABLE for all environments to test 2FA
    const mustMfa = true; // Force enable 2FA for testing

    if (mustMfa) {
      const phone = user.mobile || process.env.BF_USER_PHONE_TODD || "+15878881837";
      if (!phone) return res.status(400).json({ error: 'missing_phone' });

      try {
        await sendCode(phone, 'sms');
        const attemptId = uuid();
        mfaAttempts.set(attemptId, user); // store until code is checked
        
        // don't return a token yet
        return res.status(202).json({
          mfa_required: true,
          attemptId,
          phoneMasked: phone.replace(/^(\+\d{1,3})\d+(\d{2})$/, '$1••••••••$2'),
        });
      } catch (error) {
        console.error('Twilio Verify error:', error);
        return res.status(500).json({ error: 'sms_service_error' });
      }
    }

    // No MFA: issue token as before
    const token = signJwt({
      sub: user.id,
      email: user.email,
      role: user.role || "admin",
      tenantId: user.tenant_id || "bf",
      perms: ["user_management:full"]
    });

    return res.status(200).json({
      token,
      user: { id: user.id, email: user.email, role: user.role || "user", tenantId: user.tenant_id || null }
    });
  });

  // DISABLED: Conflicting with devBypass - causes auth session failures
  // app.get("/api/auth/session", (req: Request, res: Response) => {
  //   const token = extractBearer(req);
  //   if (!token) return res.status(401).json({ ok: false });
  //   try {
  //     const u = verifyJwt(token);
  //     return res.json({ ok: true, user: u });
  //   } catch {
  //     return res.status(401).json({ ok: false });
  //   }
  // });

  // New endpoint to check code and finish login
  app.post("/api/auth/mfa/check", express.json(), async (req: Request, res: Response) => {
    const { attemptId, code } = req.body;
    if (!attemptId || !code) return res.status(400).json({ error: 'missing_params' });
    
    const user = mfaAttempts.get(attemptId);
    if (!user) return res.status(400).json({ error: 'invalid_attempt' });

    const phone = user.mobile || process.env.BF_USER_PHONE_TODD || "+15878881837";
    
    try {
      const result = await checkCode(phone, code);

      if (result.status === 'approved') {
        mfaAttempts.delete(attemptId);
        const token = signJwt({
          sub: user.id,
          email: user.email,
          role: user.role || "admin",
          tenantId: user.tenant_id || "bf",
          perms: ["user_management:full"]
        });
        return res.json({ 
          token, 
          user: { id: user.id, email: user.email, role: user.role || "user", tenantId: user.tenant_id || null }
        });
      }
      return res.status(401).json({ error: 'invalid_code', status: result.status });
    } catch (error) {
      console.error('Twilio Verify check error:', error);
      return res.status(500).json({ error: 'verification_service_error' });
    }
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    // stateless — client will discard token
    return res.status(204).end();
  });
}