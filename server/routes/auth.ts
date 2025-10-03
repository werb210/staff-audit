import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import twilio from "twilio";
import { authJwt } from "../middleware/authJwt";

const router = Router();

const ACCESS_TTL = '15m';

function signAccessToken(user: any, amr: string[]) {
  return jwt.sign(
    { id: user.id, email: user.email, roles: user.roles || [], amr },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TTL }
  );
}
function signRefreshToken(userId: string) {
  return jwt.sign({ sub: userId, typ: 'refresh' }, process.env.JWT_SECRET!, { expiresIn: '30d' });
}

const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

// Real database user lookup
import { db } from "../db/index.js";
import { users } from "../../shared/schema.js";
import { eq } from "drizzle-orm";

async function findUserByEmail(email: string) {
  if (!email) return null;
  
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = result[0];
  
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    roles: user.roles || [user.role] || ['staff'],
    phone: user.phone || user.phoneE164 || user.mobilePhone,
    passwordHash: user.passwordHash
  };
}

// Step 1: password check + send OTP via Twilio Verify
router.post('/auth/login', async (req: any, res: any) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email/password required' });

  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  // Send OTP via Twilio Verify
  try {
    console.log(`[AUTH] Sending SMS to ${user.phone} via Verify Service ${process.env.TWILIO_VERIFY_SERVICE_SID}`);
    const verification = await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({ to: user.phone, channel: 'sms' });
    console.log(`[AUTH] Verification created:`, verification.status, verification.sid);
    return res.json({ status: 'otp_sent', phoneMasked: user.phone?.replace(/(\+\d{2})\d+(..)/, '$1••••••$2') });
  } catch (e: any) {
    console.error('[AUTH] Twilio Verify error:', e.message, e.code, e.moreInfo);
    return res.status(500).json({ error: 'verify_send_failed', details: e.message });
  }
});

// Step 2: verify OTP, then issue JWTs
router.post('/auth/login/verify', async (req: any, res: any) => {
  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ error: 'email/code required' });

  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'invalid code' });

  // Verify OTP via Twilio Verify
  try {
    const check = await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ to: user.phone, code });

    if (check.status !== 'approved') return res.status(401).json({ error: 'invalid code' });

    const access = signAccessToken(user, ['pwd', 'otp']);
    const refresh = signRefreshToken(user.id);
    return res.json({ access, refresh, user: { id: user.id, email: user.email, roles: user.roles } });
  } catch (e) {
    return res.status(401).json({ error: 'invalid code' });
  }
});


router.post('/auth/refresh', async (req: any, res: any) => {
  const { refresh } = req.body || {};
  if (!refresh) return res.status(400).json({ error: 'missing refresh' });
  try {
    const p: any = jwt.verify(refresh, process.env.JWT_SECRET!);
    const user = { id: p.sub, email: 'staff@example.com', roles: ['admin'] }; // lookup real user
    return res.json({ access: signAccessToken(user, ['refresh']), refresh: signRefreshToken(user.id) });
  } catch {
    return res.status(401).json({ error: 'invalid refresh' });
  }
});

router.post('/auth/logout', (req: any, res: any) => {
  const { refresh } = req.body || {};
  // TODO: add refresh token to blacklist if needed
  return res.status(204).end();
});

router.get('/auth/whoami', authJwt, (req: any, res: any) => {
  return res.json({ user: req.user }); // <- comes from JWT now
});

// Legacy endpoints for compatibility (can be removed later)

export default router;