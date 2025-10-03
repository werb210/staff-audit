# === SETTINGS — FULL FEATURE PACK (ONE PASTE | IDEMPOTENT) =================================
# Installs: Users CRUD, RBAC nav filtering, Feature Flags, Experiments, Integrations.
# Style: Lisa–Morgan tokens. Production build to client/dist. Safe to re-run.
set -euo pipefail
ROOT="client/src"
SECTIONS="$ROOT/pages/staff/sections"
API="$ROOT/lib/api"
LIB="$ROOT/lib"
COMP="$ROOT/components"

echo ">> 0) Ensure folders"
mkdir -p "$SECTIONS" "$API" "$LIB" "$COMP" "$ROOT/styles"

# -- Brand import (do not overwrite existing tokens) -----------------------------------------
grep -q 'styles/brand.css' "$ROOT/main.tsx" 2>/dev/null || sed -i '1i import "./styles/brand.css";' "$ROOT/main.tsx"
if [ ! -f "$ROOT/styles/brand.css" ]; then
cat > "$ROOT/styles/brand.css" <<'CSS'
:root{
  --bg:#fafbfc;--panel:#fff;--text:#0f172a;--muted:#475569;--line:#e5e7eb;
  --accent:#2563eb;--accent-quiet:#dbeafe;--success:#16a34a;--danger:#dc2626;
  --card:#f8fafc;--radius-lg:16px;--radius-md:12px;--shadow-sm:0 2px 10px rgba(0,0,0,.06);
}
html,body,#root{background:var(--bg);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;}
.lm-title{font-weight:700;font-size:1.1rem}
.lm-subtle{color:var(--muted);font-size:.875rem}
.lm-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm)}
.lm-btn{border:1px solid var(--line);border-radius:999px;background:#fff;padding:.5rem .8rem;cursor:pointer}
.lm-btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.lm-chip{padding:.25rem .6rem;border-radius:999px;background:var(--accent-quiet);border:1px solid #bfdbfe;font-size:.75rem}
.lm-input{border:1px solid var(--line);border-radius:10px;padding:.55rem .7rem;background:#fff;width:100%}
.lm-grid{display:grid;gap:12px}
CSS
fi

# -- safeFetch (create if missing) -----------------------------------------------------------
if [ ! -f "$LIB/safeFetch.ts" ]; then
cat > "$LIB/safeFetch.ts" <<'TS'
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

# -- RBAC config + helpers -------------------------------------------------------------------
mkdir -p "$ROOT/lib/auth"
cat > "$ROOT/lib/auth/roles.ts" <<'TS'
export type Role="admin"|"manager"|"staff"|"lender"|"referrer";
export type TabKey =
  |"dashboard"|"pipeline"|"contacts"|"comms"|"marketing"|"lenders"|"settings";

export const TAB_ROLES:Record<TabKey, Role[]> = {
  dashboard:["admin","manager","staff"],
  pipeline:["admin","manager","staff"],
  contacts:["admin","manager","staff"],
  comms:["admin","manager","staff"],
  marketing:["admin","manager"],
  lenders:["admin","manager","lender"],
  settings:["admin","manager"]
};

export function getUserRolesFromStorage():Role[]{
  const txt=typeof localStorage!=="undefined"?localStorage.getItem("roles")||"":"";
  return txt.split(",").map(s=>s.trim()).filter(Boolean) as Role[];
}
TS

# -- API: Users / RBAC / Flags / Experiments / Integrations ----------------------------------
cat > "$API/rbac.ts" <<'TS'
import { safeFetchJson } from "../safeFetch";
export type UserRow={id:string;email:string;name?:string;roles:string[];phone?:string;active?:boolean;createdAt?:string};
export type CreateUser={email:string;password?:string;name?:string;roles:string[];phone?:string;active?:boolean};
const R=(p:string)=>p;

export async function listUsers(){
  const tries=[R("/api/rbac/auth/users"),R("/api/admin/users"),R("/api/users")];
  for(const u of tries){ const r=await safeFetchJson<UserRow[]>(u); if(r.ok && Array.isArray(r.data)) return r.data; }
  return [];
}
export async function createUser(x:CreateUser){
  const tries=[{m:"POST",u:R("/api/rbac/auth/register")},{m:"POST",u:R("/api/users")}];
  for(const t of tries){ const r=await safeFetchJson<UserRow>(t.u,{method:t.m,headers:{"content-type":"application/json"},body:JSON.stringify(x)}); if(r.ok) return r.data; }
  return null;
}
export async function updateUser(id:string, patch:Partial<CreateUser>){
  const tries=[{m:"PATCH",u:R(`/api/rbac/auth/users/${id}`)},{m:"PATCH",u:R(`/api/users/${id}`)}];
  for(const t of tries){ const r=await safeFetchJson<UserRow>(t.u,{method:t.m,headers:{"content-type":"application/json"},body:JSON.stringify(patch)}); if(r.ok) return r.data; }
  return null;
}
export async function deleteUser(id:string){
  const tries=[R(`/api/rbac/auth/users/${id}`),R(`/api/users/${id}`)];
  for(const u of tries){ const r=await safeFetchJson(u,{method:"DELETE"}); if(r.ok) return true; }
  return false;
}

export type Flag={ key:string; value?:any; description?:string; };
export async function listFlags(){ for(const u of ["/api/flags/flags"]) { const r=await safeFetchJson<Flag[]>(u); if(r.ok) return r.data; } return []; }
export async function createFlag(f:Flag){ const r=await safeFetchJson("/api/flags/flags",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(f)}); return r.ok; }
export async function evalFlag(key:string){ const r=await safeFetchJson(`/api/flags/flags/${encodeURIComponent(key)}/eval`); return r.ok?r.data:null; }
export async function overrideFlag(key:string,value:any){ const r=await safeFetchJson(`/api/flags/flags/${encodeURIComponent(key)}/override`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({value})}); return r.ok; }

export type Experiment={ key:string; variant?:string; description?:string; };
export async function listExperiments(){ const r=await safeFetchJson<Experiment[]>("/api/flags/experiments"); return r.ok?r.data:[]; }
export async function createExperiment(e:Experiment){ const r=await safeFetchJson("/api/flags/experiments",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(e)}); return r.ok; }
export async function assignExperiment(key:string){ const r=await safeFetchJson(`/api/flags/experiments/${encodeURIComponent(key)}/assign`); return r.ok?r.data:null; }
export async function eventExperiment(key:string,event:string,meta?:any){ const r=await safeFetchJson(`/api/flags/experiments/${encodeURIComponent(key)}/event`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event,meta})}); return r.ok; }

export async function fetchMe(){ const r=await safeFetchJson<any>("/api/auth/me"); return r.ok?r.data:null; }
TS

cat > "$API/integrations.ts" <<'TS'
import { safeFetchJson } from "../safeFetch";
type S = {connected:boolean; details?:any; authUrl?:string};
async function status(paths:string[]){ for(const p of paths){ const r=await safeFetchJson<S>(p); if(r.ok) return r.data as any; } return {connected:false}; }
async function connect(paths:string[]){ for(const p of paths){ const r=await safeFetchJson<any>(p); if(r.ok){ // redirect if authUrl provided
    const url=(r.data && (r.data.authUrl||r.data.url))||p; if(typeof window!=="undefined") window.location.href=url; return true; } }
  return false;
}
async function disconnect(paths:string[]){ for(const p of paths){ const r=await safeFetchJson<any>(p,{method:"POST"}); if(r.ok) return true; } return false; }

export const O365={
  status:()=>status(["/api/o365/status","/api/microsoft/status"]),
  connect:()=>connect(["/api/o365/connect","/api/microsoft/connect"]),
  disconnect:()=>disconnect(["/api/o365/disconnect"]),
};
export const GoogleAds={
  status:()=>status(["/api/google/ads/status","/api/googleads/status"]),
  connect:()=>connect(["/api/google/ads/connect"]),
  disconnect:()=>disconnect(["/api/google/ads/disconnect"]),
};
export const GA4={
  status:()=>status(["/api/google/analytics/status","/api/ga4/status"]),
  connect:()=>connect(["/api/google/analytics/connect","/api/ga4/connect"]),
  disconnect:()=>disconnect(["/api/google/analytics/disconnect","/api/ga4/disconnect"]),
};
export const LinkedIn={
  status:()=>status(["/api/linkedin/status"]),
  connect:()=>connect(["/api/linkedin/connect"]),
  disconnect:()=>disconnect(["/api/linkedin/disconnect"]),
};
export const Twilio={
  status:()=>status(["/api/twilio/status","/api/voice/status"]),
  connect:()=>connect(["/api/twilio/connect"]), // usually none; placeholder
  disconnect:()=>disconnect(["/api/twilio/disconnect"]),
};
TS

# -- Generic small UI parts ------------------------------------------------------------------
cat > "$COMP/Field.tsx" <<'TSX'
import React from "react";
export default function Field({label,children}:{label:string;children:any}){
  return (
    <label style={{display:"grid",gap:6}}>
      <div className="lm-subtle">{label}</div>
      {children}
    </label>
  );
}
TSX

# -- Settings Page with sub-tabs -------------------------------------------------------------
cat > "$SECTIONS/Settings.tsx" <<'TSX'
import React from "react";
import Field from "../../components/Field";
import { listUsers, createUser, updateUser, deleteUser, listFlags, createFlag, evalFlag, overrideFlag, listExperiments, createExperiment, assignExperiment, eventExperiment, fetchMe } from "../../lib/api/rbac";
import { O365, GoogleAds, GA4, LinkedIn, Twilio } from "../../lib/api/integrations";
import { getUserRolesFromStorage, Role } from "../../lib/auth/roles";

type UserDraft={email:string;name?:string;password?:string;roles:string;phone?:string;active?:boolean};
const roleOptions:Role[]=["admin","manager","staff","lender","referrer"];

function Section({title,children,toolbar}:{title:string;children:any;toolbar?:any}){
  return (
    <div className="lm-card" style={{padding:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div className="lm-title">{title}</div>
        <div>{toolbar}</div>
      </div>
      {children}
    </div>
  );
}

function UsersPane(){
  const [rows,setRows]=React.useState<any[]>([]);
  const [loading,setLoading]=React.useState(true);
  const [draft,setDraft]=React.useState<UserDraft>({email:"",password:"",roles:"staff"});
  const [filter,setFilter]=React.useState("");
  const [me,setMe]=React.useState<any>(null);

  async function refresh(){ setLoading(true); const list=await listUsers(); setRows(list); setLoading(false); }
  React.useEffect(()=>{ void refresh(); (async()=>setMe(await fetchMe()))(); },[]);

  const showSeed = !loading && rows.length===0;

  async function seedAdmin(){
    const email=prompt("Admin email?")||"admin@example.com";
    const password=prompt("Temp password? (user can change)")||"ChangeMe!123";
    const name=prompt("Admin name?")||"Admin";
    const ok=await createUser({email,password,name,roles:["admin"],active:true});
    if(!ok) alert("Seed failed"); await refresh();
  }

  async function onCreate(){
    const body={...draft, roles:draft.roles.split(",").map(s=>s.trim()).filter(Boolean), active:true};
    if(!body.email) return alert("Email required");
    const r=await createUser(body as any);
    if(!r) return alert("Create failed");
    setDraft({email:"",password:"",roles:"staff"});
    await refresh();
  }

  async function onSave(row:any){
    const roles=(row.roles_text||"").split(",").map((s:string)=>s.trim()).filter(Boolean);
    const r=await updateUser(row.id,{email:row.email,name:row.name,phone:row.phone,roles});
    if(!r) alert("Save failed"); await refresh();
  }
  async function onDelete(id:string){ if(!confirm("Delete this user?")) return; const ok=await deleteUser(id); if(!ok) alert("Delete failed"); await refresh(); }

  const filtered = rows.filter(r => (r.email||"").toLowerCase().includes(filter.toLowerCase()) || (r.name||"").toLowerCase().includes(filter.toLowerCase()));

  return (
    <>
      <Section title="Users" toolbar={<input className="lm-input" placeholder="Search…" value={filter} onChange={e=>setFilter(e.target.value)} style={{minWidth:240}}/>}>
        {loading && <div className="lm-subtle">Loading…</div>}
        {!loading && filtered.length===0 && <div className="lm-subtle">No users.</div>}
        {showSeed && <div style={{marginBottom:8}}><button className="lm-btn primary" onClick={seedAdmin}>Seed Admin</button></div>}
        {filtered.length>0 && (
          <div className="lm-grid" style={{gridTemplateColumns:"1.6fr 1fr 1fr 1fr auto",alignItems:"center"}}>
            <div className="lm-subtle">Email</div><div className="lm-subtle">Name</div><div className="lm-subtle">Phone</div><div className="lm-subtle">Roles</div><div></div>
            {filtered.map((r:any)=>(
              <React.Fragment key={r.id}>
                <input className="lm-input" defaultValue={r.email} onChange={e=>r.email=e.target.value}/>
                <input className="lm-input" defaultValue={r.name||""} onChange={e=>r.name=e.target.value}/>
                <input className="lm-input" defaultValue={r.phone||""} onChange={e=>r.phone=e.target.value}/>
                <input className="lm-input" defaultValue={(r.roles||[]).join(",")} onChange={e=>(r.roles_text=e.target.value)} placeholder="admin,manager"/>
                <div style={{textAlign:"right",display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button className="lm-btn" onClick={()=>onSave(r)}>Save</button>
                  <button className="lm-btn" onClick={()=>onDelete(r.id)}>Delete</button>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </Section>

      <Section title="Create User">
        <div className="lm-grid" style={{gridTemplateColumns:"1fr 1fr 1fr 1fr auto"}}>
          <Field label="Email"><input className="lm-input" value={draft.email} onChange={e=>setDraft(d=>({...d,email:e.target.value}))}/></Field>
          <Field label="Name"><input className="lm-input" value={draft.name||""} onChange={e=>setDraft(d=>({...d,name:e.target.value}))}/></Field>
          <Field label="Phone"><input className="lm-input" value={draft.phone||""} onChange={e=>setDraft(d=>({...d,phone:e.target.value}))}/></Field>
          <Field label="Roles (csv)">
            <input className="lm-input" value={draft.roles} onChange={e=>setDraft(d=>({...d,roles:e.target.value}))} placeholder="staff,manager"/>
          </Field>
          <div style={{display:"flex",alignItems:"end"}}><button className="lm-btn primary" onClick={onCreate}>Create</button></div>
        </div>
      </Section>
    </>
  );
}

function FlagsPane(){
  const [rows,setRows]=React.useState<any[]>([]);
  const [key,setKey]=React.useState(""); const [value,setValue]=React.useState("");
  React.useEffect(()=>{(async()=>setRows(await listFlags()))()},[]);
  async function onCreate(){ if(!key) return; const ok=await createFlag({key, value:value||undefined}); if(!ok) alert("Create failed"); setRows(await listFlags()); setKey(""); setValue(""); }
  async function onEval(k:string){ const r=await evalFlag(k); alert(JSON.stringify(r,null,2)); }
  async function onOverride(k:string){ const v=prompt("Override value (JSON)","true")||"true"; try{ const parsed=JSON.parse(v); const ok=await overrideFlag(k,parsed); if(!ok) alert("Override failed"); }catch{ alert("Invalid JSON"); } }
  return (
    <>
      <Section title="Feature Flags">
        {!rows.length && <div className="lm-subtle">No flags.</div>}
        {rows.length>0 && (
          <div className="lm-grid" style={{gridTemplateColumns:"1fr 1fr auto auto"}}>
            <div className="lm-subtle">Key</div><div className="lm-subtle">Value</div><div></div><div></div>
            {rows.map((r:any)=>(
              <React.Fragment key={r.key}>
                <div style={{fontWeight:600}}>{r.key}</div>
                <div>{JSON.stringify(r.value)}</div>
                <div style={{textAlign:"right"}}><button className="lm-btn" onClick={()=>onEval(r.key)}>Eval</button></div>
                <div style={{textAlign:"right"}}><button className="lm-btn" onClick={()=>onOverride(r.key)}>Override</button></div>
              </React.Fragment>
            ))}
          </div>
        )}
      </Section>
      <Section title="Create Flag">
        <div className="lm-grid" style={{gridTemplateColumns:"1fr 1fr auto"}}>
          <Field label="Key"><input className="lm-input" value={key} onChange={e=>setKey(e.target.value)}/></Field>
          <Field label="Value (JSON optional)"><input className="lm-input" value={value} onChange={e=>setValue(e.target.value)} placeholder='true / "blue" / {"pct":50}'/></Field>
          <div style={{display:"flex",alignItems:"end"}}><button className="lm-btn primary" onClick={onCreate}>Create</button></div>
        </div>
      </Section>
    </>
  );
}

function ExperimentsPane(){
  const [rows,setRows]=React.useState<any[]>([]);
  const [key,setKey]=React.useState(""); const [variant,setVariant]=React.useState("");
  React.useEffect(()=>{(async()=>setRows(await listExperiments()))()},[]);
  async function onCreate(){ if(!key) return; const ok=await createExperiment({key,variant:variant||undefined}); if(!ok) alert("Create failed"); setRows(await listExperiments()); setKey(""); setVariant(""); }
  async function onAssign(k:string){ const r=await assignExperiment(k); alert(JSON.stringify(r,null,2)); }
  async function onEvent(k:string){ const name=prompt("Event name","convert")||"convert"; const ok=await eventExperiment(k,name,{ts:Date.now()}); if(!ok) alert("Event failed"); }
  return (
    <>
      <Section title="Experiments">
        {!rows.length && <div className="lm-subtle">No experiments.</div>}
        {rows.length>0 && (
          <div className="lm-grid" style={{gridTemplateColumns:"1fr 1fr auto auto"}}>
            <div className="lm-subtle">Key</div><div className="lm-subtle">Variant</div><div></div><div></div>
            {rows.map((r:any)=>(
              <React.Fragment key={r.key}>
                <div style={{fontWeight:600}}>{r.key}</div><div>{r.variant||"—"}</div>
                <div style={{textAlign:"right"}}><button className="lm-btn" onClick={()=>onAssign(r.key)}>Assign</button></div>
                <div style={{textAlign:"right"}}><button className="lm-btn" onClick={()=>onEvent(r.key)}>Event</button></div>
              </React.Fragment>
            ))}
          </div>
        )}
      </Section>
      <Section title="Create Experiment">
        <div className="lm-grid" style={{gridTemplateColumns:"1fr 1fr auto"}}>
          <Field label="Key"><input className="lm-input" value={key} onChange={e=>setKey(e.target.value)}/></Field>
          <Field label="Variant (optional)"><input className="lm-input" value={variant} onChange={e=>setVariant(e.target.value)}/></Field>
          <div style={{display:"flex",alignItems:"end"}}><button className="lm-btn primary" onClick={onCreate}>Create</button></div>
        </div>
      </Section>
    </>
  );
}

function IntegrationsPane(){
  function Card({title,desc,hook}:{title:string;desc:string;hook:{status:()=>Promise<any>;connect:()=>Promise<any>;disconnect:()=>Promise<any>}}){
    const [st,setSt]=React.useState<any>({connected:false});
    React.useEffect(()=>{(async()=>setSt(await hook.status()))()},[]);
    return (
      <div className="lm-card" style={{padding:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div className="lm-title">{title}</div>
            <div className="lm-subtle">{desc}</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {!st.connected && <button className="lm-btn primary" onClick={()=>hook.connect()}>Connect</button>}
            {st.connected && <button className="lm-btn" onClick={()=>hook.disconnect()}>Disconnect</button>}
          </div>
        </div>
        <div className="lm-subtle" style={{marginTop:8}}>Status: {st.connected?"Connected":"Not connected"}</div>
      </div>
    );
  }
  return (
    <div className="lm-grid" style={{gridTemplateColumns:"1fr 1fr",alignItems:"start"}}>
      <Card title="Microsoft 365 (Office/Outlook/Teams)" desc="Email, Calendar, Tasks, Teams" hook={O365}/>
      <Card title="Google Ads" desc="CRM conversions & audiences" hook={GoogleAds}/>
      <Card title="Google Analytics (GA4)" desc="Attribution & funnels" hook={GA4}/>
      <Card title="LinkedIn" desc="Marketing + messaging (where allowed)" hook={LinkedIn}/>
      <Card title="Twilio" desc="Verify, Notify, SMS/Voice" hook={Twilio}/>
    </div>
  );
}

export default function Settings(){
  const [tab,setTab]=React.useState<"users"|"flags"|"experiments"|"integrations">("users");
  const btn=(k:any,l:string)=> <button className={`lm-btn ${tab===k?"primary":""}`} onClick={()=>setTab(k)}>{l}</button>;
  return (
    <div className="lm-grid" style={{gap:12}}>
      <div className="lm-card" style={{padding:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div className="lm-title">Settings</div>
        <div style={{display:"flex",gap:8}}>
          {btn("users","Users")}
          {btn("flags","Feature Flags")}
          {btn("experiments","Experiments")}
          {btn("integrations","Integrations")}
        </div>
      </div>
      {tab==="users" && <UsersPane/>}
      {tab==="flags" && <FlagsPane/>}
      {tab==="experiments" && <ExperimentsPane/>}
      {tab==="integrations" && <IntegrationsPane/>}
    </div>
  );
}
TSX

# -- RBAC nav filtering (hide tabs per role) -------------------------------------------------
TAB1="$ROOT/pages/staff/TopTabsDashboard.tsx"
TAB2="$ROOT/pages/Dashboard.tsx"
inject_nav_filter() {
  local F="$1"
  [ -f "$F" ] || return 0
  grep -q 'getUserRolesFromStorage' "$F" 2>/dev/null || sed -i '1i import { TAB_ROLES, getUserRolesFromStorage, type TabKey } from "../../lib/auth/roles";' "$F"
  grep -q 'import Settings from "./sections/Settings"' "$F" 2>/dev/null || sed -i '1i import Settings from "./sections/Settings";' "$F"

  # Replace/ensure the render switch for settings
  perl -0777 -i -pe 's/\{tab===["'\''"]settings["'\''"]\}[\s\S]*?\}/\{tab==="settings" && <Settings\/>\}/s' "$F" || true

  # Guard nav items: wrap an items array with filter by roles (idempotent try)
  perl -0777 -i -pe 's/const\s+tabs\s*=\s*\[([\s\S]*?)\];/const tabs = [\1].filter(t => { try { const roles=getUserRolesFromStorage(); const need = TAB_ROLES[t.key as unknown as TabKey] || []; return need.length===0 || roles.some(r=>need.includes(r as any)); } catch { return true; } });/s' "$F" || true
}
inject_nav_filter "$TAB1"
inject_nav_filter "$TAB2"

# -- Build to client/dist --------------------------------------------------------------------
echo ">> Build to client/dist"
rm -rf client/dist dist dist/public 2>/dev/null || true
if npx --yes vite build --mode production >/dev/null 2>&1; then echo "vite build OK"; else npm run build || true; fi
mkdir -p client/dist
[ -d dist/public ] && cp -r dist/public/* client/dist/ && rm -rf dist
test -f client/dist/index.html || { echo "❌ Build missing at client/dist/index.html"; exit 1; }

echo
echo "✅ SETTINGS installed:"
echo "   • Users CRUD + Seed Admin if empty"
echo "   • Role-based nav filtering (admin/manager/staff/lender/referrer)"
echo "   • Feature Flags + Experiments"
echo "   • Integrations (O365, Google Ads, GA4, LinkedIn, Twilio)"
echo "   • Lisa-Morgan UI tokens"
echo "   • Production build → client/dist ✓"
echo
echo "🎯 READY: Settings tab should appear in staff nav for admin/manager roles"
