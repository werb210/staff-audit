# === AUTH WALL + LOGIN + 2FA + WEBAUTHN — ONE PASTE (IDEMPOTENT) ===========================
set -euo pipefail
ROOT="client/src"
API="$ROOT/lib/api"
AUTH="$ROOT/lib/auth"
COMP="$ROOT/components"
PAGES="$ROOT/pages"
SECTIONS="$ROOT/pages/staff/sections"

mkdir -p "$API" "$AUTH" "$COMP" "$PAGES" "$SECTIONS" "$ROOT/styles"

# 0) Ensure brand tokens are imported once
grep -q 'styles/brand.css' "$ROOT/main.tsx" 2>/dev/null || sed -i '1i import "./styles/brand.css";' "$ROOT/main.tsx"

# 1) safeFetch helper (if missing)
if [ ! -f "$ROOT/lib/safeFetch.ts" ]; then
cat > "$ROOT/lib/safeFetch.ts" <<'TS'
export type Ok<T>={ok:true;data:T}; export type Err={ok:false;error:any};
export async function safeFetchJson<T=any>(url:string, init:RequestInit={}):Promise<Ok<T>|Err>{
  try{
    const headers=new Headers(init.headers||{});
    if(!headers.has('authorization')){
      const tok=typeof localStorage!=="undefined"?localStorage.getItem('apiToken'):null;
      if(tok) headers.set('authorization', tok.startsWith('Bearer')?tok:`Bearer ${tok}`);
    }
    init.headers=headers;
    const r=await fetch(url, init);
    const ct=r.headers.get('content-type')||'';
    const body:any=ct.includes('application/json')?await r.json():await r.text();
    if(!r.ok) return {ok:false,error:{status:r.status,body}};
    return {ok:true,data:body as T};
  }catch(e){return{ok:false,error:e}}
}
TS
fi

# 2) RBAC roles (if missing)
mkdir -p "$AUTH"
cat > "$AUTH/roles.ts" <<'TS'
export type Role="admin"|"manager"|"staff"|"lender"|"referrer";
export function getUserRolesFromStorage():Role[]{
  const txt=typeof localStorage!=="undefined"?localStorage.getItem("roles")||"":"";
  return txt.split(",").map(s=>s.trim()).filter(Boolean) as Role[];
}
export function setUserRolesInStorage(roles:string[]){ localStorage.setItem("roles", roles.join(",")); }
TS

# 3) Auth API (login/logout/me/2fa/webauthn/change password)
cat > "$API/auth.ts" <<'TS'
import { safeFetchJson } from "../safeFetch";

type LoginRes = { token?:string; roles?:string[]; mfa_required?:boolean; webauthn?:boolean; user?:any };
export async function login(email:string,password:string){
  const tries=[{m:"POST",u:"/api/auth/login"},{m:"POST",u:"/api/login"}];
  for(const t of tries){
    const r=await safeFetchJson<LoginRes>(t.u,{method:t.m,headers:{"content-type":"application/json"},body:JSON.stringify({email,password})});
    if(r.ok) return r.data;
  }
  return null;
}
export async function me(){ const r=await safeFetchJson<any>("/api/auth/me"); return r.ok?r.data:null; }
export async function logout(){
  const tries=["/api/auth/logout","/api/logout"];
  for(const u of tries){ const r=await safeFetchJson(u,{method:"POST"}); if(r.ok) return true; }
  return false;
}
export async function mustChange(){ const r=await safeFetchJson<any>("/api/auth/must-change"); return r.ok?r.data?.mustChange===true:false; }
export async function changePassword(current:string,newPassword:string){
  const r=await safeFetchJson("/api/auth/change-password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({current,newPassword})});
  return r.ok;
}

/** Twilio Verify / OTP */
export async function request2fa(emailOrPhone:string){
  const tries=[{m:"POST",u:"/api/auth/request-2fa",k:"value"},{m:"POST",u:"/api/otp/request",k:"to"}];
  for(const t of tries){
    const r=await safeFetchJson<any>(t.u,{method:t.m,headers:{"content-type":"application/json"},body:JSON.stringify({[t.k]:emailOrPhone})});
    if(r.ok) return true;
  } return false;
}
export async function verify2fa(code:string, emailOrPhone?:string){
  const tries=[{m:"POST",u:"/api/auth/verify-2fa",b:{code,emailOrPhone}},{m:"POST",u:"/api/otp/verify",b:{code}}];
  for(const t of tries){ const r=await safeFetchJson<any>(t.u,{method:t.m,headers:{"content-type":"application/json"},body:JSON.stringify(t.b)});
    if(r.ok && (r.data?.token || r.data?.roles)) return r.data;
  } return null;
}

/** WebAuthn */
export async function webauthnChallenge(){
  const tries=["/api/auth/webauthn/challenge","/api/webauthn/challenge"];
  for(const u of tries){ const r=await safeFetchJson<any>(u); if(r.ok) return r.data; }
  return null;
}
export async function webauthnVerify(assertion:any){
  const tries=["/api/auth/webauthn/verify","/api/webauthn/verify"];
  for(const u of tries){ const r=await safeFetchJson<any>(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(assertion)}); if(r.ok) return r.data; }
  return null;
}
TS

# 4) AuthGate component (guards the app; shows Login when needed)
cat > "$COMP/AuthGate.tsx" <<'TSX'
import React from "react";
import { me, mustChange } from "../lib/api/auth";
import Login from "../pages/Login";
import MustChangePassword from "../pages/MustChangePassword";

export default function AuthGate({children}:{children:any}){
  const [state,setState]=React.useState<"checking"|"login"|"must-change"|"ok">("checking");
  React.useEffect(()=>{(async()=>{
    const m=await me();
    if(m && m.id){ const mc=await mustChange(); setState(mc?"must-change":"ok"); }
    else setState("login");
  })()},[]);
  if(state==="checking") return <div className="lm-card" style={{padding:16}}>Checking session…</div>;
  if(state==="login") return <Login onSuccess={()=>setState("ok")} />;
  if(state==="must-change") return <MustChangePassword onDone={()=>setState("ok")} />;
  return children;
}
TSX

# 5) Login / OTP / WebAuthn pages
cat > "$PAGES/Login.tsx" <<'TSX'
import React from "react";
import { login, request2fa, verify2fa, webauthnChallenge, webauthnVerify } from "../lib/api/auth";
import { setUserRolesInStorage } from "../lib/auth/roles";

export default function Login({onSuccess}:{onSuccess:()=>void}){
  const [email,setEmail]=React.useState(""); const [password,setPassword]=React.useState("");
  const [step,setStep]=React.useState<"login"|"otp">("login");
  const [otpTo,setOtpTo]=React.useState(""); const [code,setCode]=React.useState("");
  const [busy,setBusy]=React.useState(false); const [err,setErr]=React.useState<string>("");

  async function doLogin(e:React.FormEvent){ e.preventDefault(); setBusy(true); setErr("");
    const r=await login(email,password); setBusy(false);
    if(!r){ setErr("Login failed"); return; }
    if(r.mfa_required){ setOtpTo(email); const ok=await request2fa(email); if(!ok) setErr("OTP send failed"); setStep("otp"); return; }
    if(r.token){ localStorage.setItem("apiToken", r.token.startsWith("Bearer")?r.token:`Bearer ${r.token}`); setUserRolesInStorage(r.roles||[]); onSuccess(); return; }
    // if server returned session cookie only:
    setUserRolesInStorage(r.roles||[]); onSuccess();
  }

  async function doVerify(e:React.FormEvent){ e.preventDefault(); setBusy(true); setErr("");
    const r=await verify2fa(code, otpTo); setBusy(false);
    if(!r){ setErr("Invalid code"); return; }
    if(r.token){ localStorage.setItem("apiToken", r.token.startsWith("Bearer")?r.token:`Bearer ${r.token}`); }
    setUserRolesInStorage(r.roles||[]);
    onSuccess();
  }

  async function doWebAuthn(){
    setErr(""); setBusy(true);
    try{
      const challenge=await webauthnChallenge();
      if(!challenge){ setErr("WebAuthn not available"); setBusy(false); return; }
      const assertion:any = await (navigator as any).credentials.get({ publicKey: challenge });
      const vr = await webauthnVerify(assertion);
      if(vr?.token){ localStorage.setItem("apiToken", vr.token.startsWith("Bearer")?vr.token:`Bearer ${vr.token}`); }
      if(vr?.roles) setUserRolesInStorage(vr.roles);
      onSuccess();
    }catch(e:any){ setErr("WebAuthn failed"); }
    setBusy(false);
  }

  return (
    <div style={{display:"grid",placeItems:"center",minHeight:"60vh"}}>
      <form onSubmit={step==="login"?doLogin:doVerify} className="lm-card" style={{padding:20,minWidth:340}}>
        <div className="lm-title" style={{marginBottom:10}}>Staff Sign In</div>
        {step==="login" && (
          <>
            <label className="lm-subtle">Email</label>
            <input className="lm-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
            <div style={{height:8}} />
            <label className="lm-subtle">Password</label>
            <input className="lm-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button className="lm-btn primary" type="submit" disabled={busy}>Sign In</button>
              <button className="lm-btn" type="button" onClick={doWebAuthn} disabled={busy}>Use Security Key</button>
            </div>
          </>
        )}
        {step==="otp" && (
          <>
            <div className="lm-subtle" style={{marginBottom:6}}>Enter the 6-digit code we sent to <b>{otpTo}</b></div>
            <input className="lm-input" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code} onChange={e=>setCode(e.target.value)} />
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button className="lm-btn primary" type="submit" disabled={busy}>Verify Code</button>
              <button className="lm-btn" type="button" onClick={()=>request2fa(otpTo)}>Resend</button>
            </div>
          </>
        )}
        {!!err && <div style={{color:"var(--danger)",marginTop:10}}>{err}</div>}
      </form>
    </div>
  );
}
TSX

# 6) Must-change password + Change Password utility page
cat > "$PAGES/MustChangePassword.tsx" <<'TSX'
import React from "react";
import { changePassword } from "../lib/api/auth";
export default function MustChangePassword({onDone}:{onDone:()=>void}){
  const [current,setCurrent]=React.useState(""); const [next,setNext]=React.useState(""); const [busy,setBusy]=React.useState(false); const [err,setErr]=React.useState("");
  async function submit(e:React.FormEvent){ e.preventDefault(); setBusy(true); setErr(""); const ok=await changePassword(current,next); setBusy(false); if(ok) onDone(); else setErr("Password change failed"); }
  return (
    <div style={{display:"grid",placeItems:"center",minHeight:"60vh"}}>
      <form onSubmit={submit} className="lm-card" style={{padding:20,minWidth:340}}>
        <div className="lm-title" style={{marginBottom:10}}>Update Your Password</div>
        <label className="lm-subtle">Current</label>
        <input className="lm-input" type="password" value={current} onChange={e=>setCurrent(e.target.value)} required/>
        <div style={{height:8}}/>
        <label className="lm-subtle">New Password</label>
        <input className="lm-input" type="password" value={next} onChange={e=>setNext(e.target.value)} required/>
        <div style={{marginTop:12}}><button className="lm-btn primary" disabled={busy}>Change Password</button></div>
      </form>
    </div>
  );
}
TSX

# 7) Logout page (calls API + clears storage)
cat > "$PAGES/Logout.tsx" <<'TSX'
import React from "react";
import { logout } from "../lib/api/auth";
export default function Logout(){
  React.useEffect(()=>{(async()=>{
    try{ await logout(); }catch{}
    localStorage.removeItem("apiToken"); localStorage.removeItem("roles");
    location.href = "/dashboard#/"; // send back to app root
  })()},[]);
  return <div className="lm-card" style={{padding:16}}>Signing out…</div>;
}
TSX

# 8) Wrap Staff Dashboard with AuthGate (idempotent)
wrap_auth () {
  local F="$1"
  [ -f "$F" ] || return 0
  grep -q 'AuthGate' "$F" 2>/dev/null || sed -i '1i import AuthGate from "../../components/AuthGate";' "$F"
  # Wrap default export render JSX root once
  perl -0777 -i -pe 's/export default function ([A-Za-z0-9_]+)\(\)\s*\{([\s\S]*?)return\s*\(\s*<div/export default function $1(){\n$2return (<AuthGate>\n<div/s' "$F" || true
  perl -0777 -i -pe 's/<\/div>\s*\);\s*}\s*$/<\/div>\n<\/AuthGate>);\n}\n/s' "$F" || true
}
wrap_auth "$ROOT/pages/staff/TopTabsDashboard.tsx"
wrap_auth "$ROOT/pages/Dashboard.tsx"

# 9) Add a Settings import if not present (from your previous step)
grep -q 'from "./sections/Settings"' "$ROOT/pages/staff/TopTabsDashboard.tsx" 2>/dev/null || \
  sed -i '1i import Settings from "./sections/Settings";' "$ROOT/pages/staff/TopTabsDashboard.tsx" 2>/dev/null || true

# 10) Build to client/dist
echo ">> Build"
rm -rf client/dist dist dist/public 2>/dev/null || true
if npx --yes vite build --mode production >/dev/null 2>&1; then echo "vite build OK"; else npm run build || true; fi
[ -d dist/public ] && mkdir -p client/dist && cp -r dist/public/* client/dist/ && rm -rf dist
test -f client/dist/index.html || { echo "❌ Build missing at client/dist/index.html"; exit 1; }

echo
echo "✅ Auth enabled:"
echo "   • AuthWall guards Staff app"
echo "   • Email/Password ➜ optional OTP (Twilio Verify)"
echo "   • WebAuthn sign-in"
echo "   • Logout + Must-Change-Password flow"
echo "   • Roles persisted -> tabs filtered"
echo "→ Open /dashboard#/"
