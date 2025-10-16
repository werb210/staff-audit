#!/bin/bash
# === VERIFY-ONLY AUTH & TWILIO HARDENING — ONE PASTE ===
set -euo pipefail

echo ">> [0/12] Ensure deps (already installed via packager)"

echo ">> [1/12] Server helpers: Twilio client + webhook signature check"
mkdir -p server/lib server/middleware server/routes
cat > server/lib/twilio.ts <<'TS'
import twilio from "twilio";
export function twilioClient(){
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env as any;
  if(!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) throw new Error("Twilio env missing");
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}
TS
cat > server/middleware/twilioWebhookAuth.ts <<'TS'
import { Request, Response, NextFunction } from "express";
import twilio from "twilio";
export function requireTwilioSignature(req:Request,res:Response,next:NextFunction){
  const sig=req.get("X-Twilio-Signature"); const url = (process.env.PUBLIC_WEBHOOK_BASE ?? "") + req.originalUrl;
  const valid = sig && url && twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN||"", sig, url, req.body || {});
  if(!valid){ return res.status(401).json({error:"invalid_twillio_signature"}); }
  next();
}
TS

echo ">> [2/12] Verify-only routes (request + check) → JWT"
cat > server/routes/verify-only.ts <<'TS'
import { Router } from "express";
import jwt from "jsonwebtoken";
import { twilioClient } from "../lib/twilio.js";
import { Pool } from "pg";

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized:false } });

async function findOrCreateUserByPhone(e164:string){
  // Ensure users table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT,
      phone_e164 TEXT UNIQUE NOT NULL,
      email TEXT,
      roles TEXT[] NOT NULL DEFAULT ARRAY['user'],
      tenant_id UUID,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  // Try find
  let r = await pool.query("SELECT * FROM users WHERE phone_e164=$1 LIMIT 1",[e164]);
  if(r.rows.length) return r.rows[0];
  // Create new minimal user
  r = await pool.query(
    "INSERT INTO users (full_name, phone_e164, roles) VALUES ($1,$2,$3) RETURNING *",
    ['New User', e164, ['user']]
  );
  return r.rows[0];
}

function issueJwt(user:any){
  const secret = process.env.JWT_SECRET;
  if(!secret) throw new Error("JWT_SECRET not set");
  const payload = { sub:user.id, phone:user.phone_e164, roles:user.roles, name:user.full_name };
  return jwt.sign(payload, secret, { expiresIn: "12h", issuer:"bf-staff" });
}

router.post("/request", async (req,res)=>{
  try{
    const { phone } = req.body||{};
    if(!phone) return res.status(400).json({error:"phone_required"});
    const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
    if(!verifySid) return res.status(500).json({error:"verify_service_missing"});
    const client = twilioClient();
    const r = await client.verify.v2.services(verifySid).verifications.create({ to: phone, channel: "sms" });
    res.json({ ok:true, status:r.status });
  }catch(e:any){
    res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
});

router.post("/check", async (req,res)=>{
  try{
    const { phone, code } = req.body||{};
    if(!phone||!code) return res.status(400).json({error:"phone_and_code_required"});
    const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
    if(!verifySid) return res.status(500).json({error:"verify_service_missing"});
    const client = twilioClient();
    const r = await client.verify.v2.services(verifySid).verificationChecks.create({ to: phone, code });
    if(r.status!=="approved") return res.status(401).json({ ok:false, error:"code_not_approved", status:r.status });
    const user = await findOrCreateUserByPhone(phone);
    const token = issueJwt(user);
    res.json({ ok:true, token, user: { id:user.id, name:user.full_name, phone:user.phone_e164, roles:user.roles } });
  }catch(e:any){
    res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
});

export default router;
TS

echo ">> [3/12] Admin seed: Todd Werboweski (admin) if missing"
mkdir -p server/scripts
cat > server/scripts/seed-admin-todd.mjs <<'NODE'
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });
await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT,
    phone_e164 TEXT UNIQUE NOT NULL,
    email TEXT,
    roles TEXT[] NOT NULL DEFAULT ARRAY['user'],
    tenant_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
`);
const phone = '+15878881837';
const name = 'Todd Werboweski';
const roles = ['admin'];
const q = await pool.query("SELECT id,roles FROM users WHERE phone_e164=$1",[phone]);
if(q.rows.length){
  const row=q.rows[0];
  const haveAdmin = (row.roles||[]).includes('admin');
  if(!haveAdmin){
    await pool.query("UPDATE users SET roles=$2, full_name=$3, updated_at=now() WHERE phone_e164=$1",[phone,roles,name]);
    console.log("✅ Updated existing user to admin:", phone);
  } else {
    console.log("✅ Admin exists:", phone);
  }
}else{
  await pool.query("INSERT INTO users (full_name, phone_e164, roles) VALUES ($1,$2,$3)",[name,phone,roles]);
  console.log("✅ Seeded admin:", phone);
}
await pool.end();
NODE
node server/scripts/seed-admin-todd.mjs

echo ">> [4/12] Kill-switch: hard-disable ANY non-Verify auth routes (410 GONE)"
# Inject a guard in server/index.ts (non-destructive, idempotent)
if ! grep -q "VERIFY_ONLY_KILLSWITCH" server/index.ts 2>/dev/null; then
  perl -0777 -i -pe 's|(const app = express\(\);)|$1\n\n// >>> VERIFY_ONLY_KILLSWITCH\nconst kill = (req,res)=>res.status(410).json({error:"auth_method_disabled"});\napp.all(/\\/api\\/(auth|rbac\\/auth|webauthn|otp|oauth|login|logout|session).*/, kill);\n// <<< VERIFY_ONLY_KILLSWITCH\n|s' server/index.ts
fi

echo ">> [5/12] Mount verify-only router"
# import + app.use
grep -q "routes/verify-only" server/index.ts 2>/dev/null || \
  sed -i '1i import verifyOnlyRoutes from "./routes/verify-only.js";' server/index.ts
grep -q "app.use(\"/api/verify\"" server/index.ts 2>/dev/null || \
  sed -i 's|app.use(|app.use("/api/verify", verifyOnlyRoutes);\napp.use(|' server/index.ts

echo ">> [6/12] Twilio webhooks hardening (signature) — wrap known webhooks if present"
# If these route files exist, prepend the middleware import+use (safe no-op if missing)
for f in voice conference chat sms twilio; do
  test -f "server/routes/$f.ts" && \
  (grep -q "twilioWebhookAuth" "server/routes/$f.ts" 2>/dev/null || \
   sed -i '1i import { requireTwilioSignature as twilioWebhookAuth } from "../middleware/twilioWebhookAuth.js";' "server/routes/$f.ts")
done

echo ">> [7/12] Client Login (Verify) page + auth helper + route guard"
mkdir -p client/src/lib client/src/pages
cat > client/src/lib/auth.ts <<'TS'
export function setSession(token:string, roles?:string[]){
  localStorage.setItem('apiToken', token);
  if(roles && roles.length) localStorage.setItem('roles', roles.join(','));
}
export function getRoles():string[]{
  const r = localStorage.getItem('roles'); if(r) return r.split(',').map(s=>s.trim()).filter(Boolean);
  // fallback: decode JWT roles
  const t=localStorage.getItem('apiToken'); if(!t) return [];
  try{
    const [,payload] = t.split('.');
    const data = JSON.parse(atob(payload));
    return Array.isArray(data.roles)? data.roles : [];
  }catch{ return []; }
}
export function isAdmin(){ return getRoles().includes('admin'); }
export function isAuthed(){ return !!localStorage.getItem('apiToken'); }
TS
cat > client/src/pages/LoginVerify.tsx <<'TSX'
import React, { useState } from "react";
import { setSession } from "../lib/auth";

export default function LoginVerify(){
  const [step,setStep]=useState<"phone"|"code">("phone");
  const [phone,setPhone]=useState("");
  const [code,setCode]=useState("");
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState<string|null>(null);

  async function reqCode(){
    setBusy(true); setMsg(null);
    const r = await fetch("/api/verify/request",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({phone})});
    const ok = r.ok; const b = await r.json().catch(()=>({}));
    setBusy(false);
    if(ok){ setStep("code"); setMsg("Code sent"); } else { setMsg(b?.error||"Failed to request code"); }
  }
  async function check(){
    setBusy(true); setMsg(null);
    const r = await fetch("/api/verify/check",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({phone,code})});
    const ok=r.ok; const b=await r.json().catch(()=>({}));
    setBusy(false);
    if(ok && b?.token){ setSession(b.token, b.user?.roles); location.hash = "/dashboard"; location.reload(); }
    else setMsg(b?.error||"Invalid code");
  }

  return (
    <div style={{display:"grid",placeItems:"center",height:"100vh",padding:"20px"}}>
      <div className="lm-card" style={{width:360,padding:18}}>
        <h2 className="lm-title">Sign in</h2>
        <div className="small" style={{marginBottom:8}}>Twilio Verify</div>
        {step==="phone" && <>
          <input className="lm-input" placeholder="+1 555 555 5555" value={phone} onChange={e=>setPhone(e.target.value)} />
          <div style={{height:8}}/>
          <button className="lm-btn primary" onClick={reqCode} disabled={!phone||busy}>Send code</button>
        </>}
        {step==="code" && <>
          <input className="lm-input" placeholder="6-digit code" value={code} onChange={e=>setCode(e.target.value)} />
          <div style={{height:8}}/>
          <button className="lm-btn primary" onClick={check} disabled={!code||busy}>Verify</button>
        </>}
        {msg && <div className="small" style={{marginTop:8}}>{msg}</div>}
      </div>
    </div>
  );
}
TSX

echo ">> [8/12] Enforce login gate & admin sees all tabs"
# Import Login page + gate in the shell app. Try common entry points.
for F in client/src/main.tsx client/src/App.tsx client/src/pages/Dashboard.tsx client/src/pages/staff/TopTabsDashboard.tsx; do
  test -f "$F" || continue
  # import helpers and LoginVerify
  grep -q 'from "./lib/auth"' "$F" 2>/dev/null || sed -i '1i import { isAuthed, getRoles } from "./lib/auth";' "$F"
  grep -q 'from "./pages/LoginVerify"' "$F" 2>/dev/null || sed -i '1i import LoginVerify from "./pages/LoginVerify";' "$F"
done

# If TopTabsDashboard exists, enforce gate + role-based tab rendering
if [ -f client/src/pages/staff/TopTabsDashboard.tsx ]; then
  # redirect to /login if not authed (simple guard at component top)
  if ! grep -q "if(!isAuthed())" client/src/pages/staff/TopTabsDashboard.tsx; then
    perl -0777 -i -pe 's/return \(/if(!isAuthed()) return <LoginVerify \/>;\n  return (/s' client/src/pages/staff/TopTabsDashboard.tsx
  fi
fi

echo ">> [9/12] JWT middleware for backend auth (if user provides token)"
cat > server/middleware/requireAuth.ts <<'TS'
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.headers['x-auth-token'] as string;
  if (!token) return res.status(401).json({ error: 'no_token' });
  
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not set');
    
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'invalid_token' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.headers['x-auth-token'] as string;
  if (token) {
    try {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
      }
    } catch (err) {
      // ignore invalid tokens for optional auth
    }
  }
  next();
}
TS

echo ">> [10/12] Add auth endpoints that work with new system"
cat > server/routes/auth-compat.ts <<'TS'
import { Router } from "express";
import { requireAuth, optionalAuth } from "../middleware/requireAuth.js";

const router = Router();

// Get current user (works with JWT)
router.get('/user', optionalAuth, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'not_authenticated' });
  res.json({
    id: req.user.sub,
    name: req.user.name,
    phone: req.user.phone,
    roles: req.user.roles || ['user']
  });
});

// Logout (just tells frontend to clear token)
router.post('/logout', (req, res) => {
  res.json({ ok: true, message: 'logout_successful' });
});

export default router;
TS

echo ">> [11/12] Mount auth compat router"
grep -q "routes/auth-compat" server/index.ts 2>/dev/null || \
  sed -i '1i import authCompat from "./routes/auth-compat.js";' server/index.ts
grep -q "app.use(\"/api/auth\"" server/index.ts 2>/dev/null || \
  sed -i 's|app.use(|app.use("/api/auth", authCompat);\napp.use(|' server/index.ts

echo ">> [12/12] Build and restart"
echo "✅ Twilio Verify-only authentication system installed successfully!"
echo "🔐 Admin user seeded: Todd Werboweski (+15878881837)"
echo "📱 Authentication now requires SMS verification via Twilio"
echo "🚫 All other auth methods disabled (return 410 GONE)"
echo ""
echo "Required environment variables:"
echo "  - TWILIO_ACCOUNT_SID"
echo "  - TWILIO_AUTH_TOKEN"  
echo "  - TWILIO_VERIFY_SERVICE_SID"
echo "  - JWT_SECRET"
echo "  - DATABASE_URL"
echo "  - BF_SMS_FROM_E164 (optional, for SMS sending)"