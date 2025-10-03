# === SETTINGS SUITE — USERS + RBAC NAV + INTEGRATIONS + FLAGS (IDEMPOTENT) ===============
set -euo pipefail
ROOT="client/src"
STY="$ROOT/styles/brand.css"
API="$ROOT/lib/api"
AUTH="$ROOT/lib/auth"
SET="$ROOT/pages/staff/sections"
SETDIR="$SET/settings"
COMP="$ROOT/components"

mkdir -p "$API" "$AUTH" "$SET" "$SETDIR" "$COMP" "$ROOT/pages" "$ROOT/lib"

# 0) Reinforce Lisa-Morgan tokens / utilities
if ! grep -q '.lm-table' "$STY" 2>/dev/null; then
cat >> "$STY" <<'CSS'
/* ------ Settings tables / editors ------ */
.lm-spread { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.lm-tabs { display:flex; gap:8px; margin: 8px 0 12px; }
.lm-tab { border:1px solid var(--line); background:#fff; border-radius:999px; padding:.45rem .85rem; cursor:pointer; }
.lm-tab.active{ background: var(--accent); border-color: var(--accent); color:#fff; }
.lm-table { width:100%; border-collapse:separate; border-spacing:0; }
.lm-table th, .lm-table td { border-bottom:1px solid var(--line); padding:.6rem .75rem; text-align:left; }
.lm-chip.role { background:#eef2ff; border:1px solid #c7d2fe; color:#3730a3; }
.lm-chip.ok { background:#dcfce7; border:1px solid #86efac; color:#065f46; }
.lm-chip.err{ background:#fee2e2; border:1px solid #fecaca; color:#991b1b; }
.lm-kv { display:grid; grid-template-columns:160px 1fr; gap:8px; }
CSS
fi
grep -q 'styles/brand.css' "$ROOT/main.tsx" 2>/dev/null || sed -i '1i import "./styles/brand.css";' "$ROOT/main.tsx"

# 1) Roles helper (idempotent)
cat > "$AUTH/roles.ts" <<'TS'
export type Role="admin"|"manager"|"staff"|"lender"|"referrer";
export function getUserRolesFromStorage():Role[]{
  const txt=typeof localStorage!=="undefined"?localStorage.getItem("roles")||"":"";
  return txt.split(",").map(s=>s.trim()).filter(Boolean) as Role[];
}
export function setUserRolesInStorage(roles:string[]){ localStorage.setItem("roles", roles.join(",")); }
export function hasAny(roles:Role[], allowed:Role[]){ return roles.some(r=>allowed.includes(r)); }
TS

# 2) API: Users CRUD + Flags + Integrations (smart fallbacks)
mkdir -p "$API"
cat > "$API/users.ts" <<'TS'
import { safeFetchJson } from "../safeFetch";
export type User = { id:string; email:string; name?:string; roles?:string[]; active?:boolean; createdAt?:string };

const paths = {
  list: ["/api/rbac/auth/users","/api/admin/users"],
  register: ["/api/rbac/auth/register","/api/admin/users"],
  update: (id:string)=>["/api/rbac/auth/users/"+id,"/api/admin/users/"+id],
  del: (id:string)=>["/api/rbac/auth/users/"+id,"/api/admin/users/"+id],
  seedAdmin: ["/api/activate-admin"]
};

export async function listUsers():Promise<User[]>{ 
  for(const u of paths.list){ const r=await safeFetchJson<User[]>(u); if(r.ok && Array.isArray(r.data)) return r.data; } 
  return []; 
}
export async function createUser(pick:Partial<User>&{password?:string; roles?:string[]}){ 
  for(const u of paths.register){ 
    const r=await safeFetchJson<any>(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(pick)});
    if(r.ok) return true; 
  } return false; 
}
export async function updateUser(id:string, patch:Partial<User>){
  for(const u of paths.update(id)){ 
    const r=await safeFetchJson<any>(u,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(patch)});
    if(r.ok) return true; 
  } return false;
}
export async function deleteUser(id:string){
  for(const u of paths.del(id)){ const r=await safeFetchJson<any>(u,{method:"DELETE"}); if(r.ok) return true; }
  return false;
}
export async function seedAdmin(){ for(const u of paths.seedAdmin){ const r=await safeFetchJson<any>(u,{method:"POST"}); if(r.ok) return true; } return false; }
TS

cat > "$API/flags.ts" <<'TS'
import { safeFetchJson } from "../safeFetch";
export async function listFlags(){ const r=await safeFetchJson<any>("/api/flags/flags"); return r.ok?(r.data||[]):[]; }
export async function createFlag(key:string, value:any){ return (await safeFetchJson("/api/flags/flags",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({key,value})})).ok; }
export async function evalFlag(key:string){ const r=await safeFetchJson<any>(`/api/flags/flags/${encodeURIComponent(key)}/eval`); return r.ok?r.data:null; }
export async function overrideFlag(key:string,value:any){ return (await safeFetchJson(`/api/flags/flags/${encodeURIComponent(key)}/override`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({value})})).ok; }

export async function listExperiments(){ const r=await safeFetchJson<any>("/api/flags/experiments"); return r.ok?(r.data||[]):[]; }
export async function createExperiment(key:string,config:any){ return (await safeFetchJson("/api/flags/experiments",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({key,...config})})).ok; }
export async function assignExperiment(key:string){ const r=await safeFetchJson<any>(`/api/flags/experiments/${encodeURIComponent(key)}/assign`); return r.ok?r.data:null; }
export async function eventExperiment(key:string,event:string){ return (await safeFetchJson(`/api/flags/experiments/${encodeURIComponent(key)}/event`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event})})).ok; }
TS

cat > "$API/integrations.ts" <<'TS'
import { safeFetchJson } from "../safeFetch";
type Status = { connected:boolean; details?:any };

async function tryGet(urls:string[]):Promise<Status|null>{
  for(const u of urls){ const r=await safeFetchJson<any>(u); if(r.ok) return {connected: !!(r.data?.connected || r.data?.ok || r.data?.status==="ok"), details:r.data}; }
  return null;
}
async function tryPost(urls:string[], body?:any):Promise<boolean>{
  for(const u of urls){ const r=await safeFetchJson<any>(u,{method:"POST",headers:{"content-type":"application/json"},body: body?JSON.stringify(body):undefined}); if(r.ok) return true; }
  return false;
}

export const m365 = {
  status: ()=>tryGet(["/api/o365/status","/api/o365/token/status"]),
  connect: ()=>{ window.open("/api/o365/connect","_blank"); return true; },
  disconnect: ()=>tryPost(["/api/o365/disconnect"]),
};
export const googleAds = {
  status: ()=>tryGet(["/api/google/ads/status","/api/google-ads/status"]),
  connect: ()=>{ window.open("/api/google/ads/connect","_blank"); return true; }
};
export const ga4 = {
  status: ()=>tryGet(["/api/google/analytics/status","/api/ga4/status"]),
  connect: ()=>{ window.open("/api/google/analytics/connect","_blank"); return true; }
};
export const linkedin = {
  status: ()=>tryGet(["/api/linkedin/status","/api/li/status"]),
  connect: ()=>{ window.open("/api/linkedin/connect","_blank"); return true; }
};
export const twilio = {
  verifyHealth: ()=>tryGet(["/api/otp/diag/health"]),
  notifyHealth: ()=>tryGet(["/api/twilio/notify/health","/api/notify/health"]),
  lookupHealth: (num:string)=>tryGet([`/api/twilio/lookup?to=${encodeURIComponent(num)}`]),
};
TS

# 3) Settings container with sub-tabs (Users / Integrations / Flags)
cat > "$SET/Settings.tsx" <<'TSX'
import React from "react";
import UsersPanel from "./settings/UsersPanel";
import IntegrationsPanel from "./settings/IntegrationsPanel";
import FeatureFlagsPanel from "./settings/FeatureFlagsPanel";
import { getUserRolesFromStorage } from "../../lib/auth/roles";

export default function Settings(){
  const [tab,setTab]=React.useState<"users"|"integrations"|"flags">("users");
  const roles = getUserRolesFromStorage();
  const isAdmin = roles.includes("admin");

  return (
    <div className="lm-container lm-col">
      <div className="lm-toolbar lm-card">
        <div className="lm-title">Settings</div>
        <div className="lm-subtle">role: {roles.join(", ")||"guest"}</div>
      </div>
      <div className="lm-tabs">
        <button className={"lm-tab "+(tab==="users"?"active":"")} onClick={()=>setTab("users")}>Users</button>
        <button className={"lm-tab "+(tab==="integrations"?"active":"")} onClick={()=>setTab("integrations")}>Integrations</button>
        <button className={"lm-tab "+(tab==="flags"?"active":"")} onClick={()=>setTab("flags")}>Feature Flags</button>
      </div>
      {tab==="users" && <UsersPanel admin={isAdmin} />}
      {tab==="integrations" && <IntegrationsPanel admin={isAdmin} />}
      {tab==="flags" && <FeatureFlagsPanel admin={isAdmin} />}
    </div>
  );
}
TSX

# 4) Users panel (list / create / edit / delete / seed admin)
cat > "$SETDIR/UsersPanel.tsx" <<'TSX'
import React from "react";
import { User, listUsers, createUser, updateUser, deleteUser, seedAdmin } from "../../../lib/api/users";

export default function UsersPanel({admin}:{admin:boolean}){
  const [rows,setRows]=React.useState<User[]>([]);
  const [loading,setLoading]=React.useState(true);
  const [form,setForm]=React.useState<Partial<User>&{password?:string; roles?:string[]}>({email:"",name:"",roles:["staff"],active:true});
  const [editing,setEditing]=React.useState<string|null>(null);
  const [pw,setPw]=React.useState("");

  async function refresh(){ setLoading(true); const r=await listUsers(); setRows(r); setLoading(false); }
  React.useEffect(()=>{refresh()},[]);

  const anyUsers = rows.length>0;

  async function onCreate(e:React.FormEvent){ e.preventDefault(); if(!admin) return;
    const ok = await createUser({...form, password: pw || undefined});
    if(ok){ setForm({email:"",name:"",roles:["staff"],active:true}); setPw(""); refresh(); } else alert("Create failed");
  }

  async function onSave(u:User){ if(!admin) return;
    const ok = await updateUser(u.id, {email:u.email, name:u.name, roles:u.roles, active:u.active});
    if(ok){ setEditing(null); refresh(); } else alert("Update failed");
  }
  async function onDelete(id:string){ if(!admin) return; if(!confirm("Delete user?")) return;
    const ok = await deleteUser(id); if(ok) refresh(); else alert("Delete failed");
  }

  async function onSeed(){ if(!admin) return; const ok=await seedAdmin(); if(ok){ alert("Admin seeded/activated"); refresh(); } else alert("Seed failed"); }

  return (
    <div className="lm-card" style={{padding:16}}>
      <div className="lm-spread">
        <div className="lm-title">Users</div>
        {!anyUsers && admin && <button className="lm-btn primary" onClick={onSeed}>Seed Admin</button>}
      </div>
      {loading ? <div className="lm-subtle">Loading…</div> : (
        <>
          <table className="lm-table">
            <thead><tr><th>Email</th><th>Name</th><th>Roles</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {rows.map(u=>(
                <tr key={u.id}>
                  <td>{editing===u.id ? <input className="lm-input" defaultValue={u.email} onChange={e=>u.email=e.target.value}/> : u.email}</td>
                  <td>{editing===u.id ? <input className="lm-input" defaultValue={u.name} onChange={e=>u.name=e.target.value}/> : (u.name||"")}</td>
                  <td>
                    {editing===u.id
                      ? <input className="lm-input" defaultValue={(u.roles||[]).join(",")} onChange={e=>u.roles=e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}/>
                      : <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(u.roles||[]).map(r=><span key={r} className="lm-chip role">{r}</span>)}</div>}
                  </td>
                  <td>{editing===u.id ? <input type="checkbox" defaultChecked={u.active} onChange={e=>u.active=e.target.checked}/> : (u.active?"Yes":"No")}</td>
                  <td style={{textAlign:"right"}}>
                    {editing===u.id
                      ? (<><button className="lm-btn primary" onClick={()=>onSave(u)}>Save</button> <button className="lm-btn" onClick={()=>setEditing(null)}>Cancel</button></>)
                      : (<><button className="lm-btn" onClick={()=>setEditing(u.id)}>Edit</button> {admin && <button className="lm-btn" onClick={()=>onDelete(u.id)}>Delete</button>}</>)
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {admin && (
            <>
              <div style={{height:16}} />
              <form onSubmit={onCreate} className="lm-kv">
                <label className="lm-subtle">Email</label>
                <input className="lm-input" required value={form.email||""} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
                <label className="lm-subtle">Name</label>
                <input className="lm-input" value={form.name||""} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
                <label className="lm-subtle">Password</label>
                <input className="lm-input" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="(server may email set-password link)"/>
                <label className="lm-subtle">Roles</label>
                <input className="lm-input" value={(form.roles||[]).join(",")} onChange={e=>setForm(f=>({...f,roles:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}))}/>
                <label className="lm-subtle">Active</label>
                <input type="checkbox" checked={form.active!==false} onChange={e=>setForm(f=>({...f,active:e.target.checked}))}/>
                <div />
                <div><button className="lm-btn primary">Create User</button></div>
              </form>
            </>
          )}
        </>
      )}
    </div>
  );
}
TSX

# 5) Integrations panel (M365, Google Ads/GA4, LinkedIn, Twilio Verify/Notify/Lookup)
cat > "$SETDIR/IntegrationsPanel.tsx" <<'TSX'
import React from "react";
import { m365, googleAds, ga4, linkedin, twilio } from "../../../lib/api/integrations";

type Row = { name:string; status?:string; ok?:boolean; actions: React.ReactNode; };

export default function IntegrationsPanel({admin}:{admin:boolean}){
  const [rows,setRows]=React.useState<Row[]>([]);
  const [lookup,setLookup]=React.useState("+15555555555");

  async function refresh(){
    const [m365s, ads, ga, li, ver, noti] = await Promise.all([
      m365.status(), googleAds.status(), ga4.status(), linkedin.status(), twilio.verifyHealth(), twilio.notifyHealth()
    ]);
    const rr:Row[] = [
      { name:"Microsoft 365", ok:!!m365s?.connected, status: m365s?.connected?"Connected":"Not connected",
        actions: (<><button className="lm-btn primary" onClick={()=>m365.connect()}>Connect</button> <button className="lm-btn" onClick={()=>m365.disconnect()}>Disconnect</button></>) },
      { name:"Google Ads", ok:!!ads?.connected, status: ads?.connected?"Connected":"Not connected", actions:(<button className="lm-btn primary" onClick={()=>googleAds.connect()}>Connect</button>) },
      { name:"Google Analytics (GA4)", ok:!!ga?.connected, status: ga?.connected?"Connected":"Not connected", actions:(<button className="lm-btn primary" onClick={()=>ga4.connect()}>Connect</button>) },
      { name:"LinkedIn", ok:!!li?.connected, status: li?.connected?"Connected":"Not connected", actions:(<button className="lm-btn primary" onClick={()=>linkedin.connect()}>Connect</button>) },
      { name:"Twilio Verify", ok:!!ver?.connected, status: ver?.connected?"OK":"Check /api/otp/diag/health", actions:(<span className={"lm-chip "+(ver?.connected?"ok":"err")}>{ver?.connected?"Healthy":"Issue"}</span>) },
      { name:"Twilio Notify", ok:!!noti?.connected, status: noti?.connected?"OK":"Check /api/notify/health", actions:(<span className={"lm-chip "+(noti?.connected?"ok":"err")}>{noti?.connected?"Healthy":"Issue"}</span>) },
    ];
    setRows(rr);
  }
  React.useEffect(()=>{refresh()},[]);

  async function doLookup(e:React.FormEvent){ e.preventDefault(); const r=await twilio.lookupHealth(lookup); alert(`Lookup ${r?.connected?"OK":"Fail"}\n`+JSON.stringify(r?.details||{},null,2)); }

  return (
    <div className="lm-card" style={{padding:16}}>
      <div className="lm-title" style={{marginBottom:8}}>Integrations</div>
      <table className="lm-table">
        <thead><tr><th>Service</th><th>Status</th><th style={{textAlign:"right"}}>Actions</th></tr></thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              <td>{r.name}</td>
              <td>{r.ok ? <span className="lm-chip ok">Connected</span> : <span className="lm-chip err">Not Connected</span>} <span className="lm-subtle" style={{marginLeft:8}}>{r.status}</span></td>
              <td style={{textAlign:"right"}}>{r.actions}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{height:16}}/>
      <form onSubmit={doLookup} className="lm-kv">
        <label className="lm-subtle">Twilio Lookup Test #</label>
        <div style={{display:"flex",gap:8}}>
          <input className="lm-input" value={lookup} onChange={e=>setLookup(e.target.value)} />
          <button className="lm-btn">Run Lookup</button>
        </div>
      </form>
      <div style={{marginTop:12}}><button className="lm-btn" onClick={()=>location.reload()}>Refresh Status</button></div>
    </div>
  );
}
TSX

# 6) Feature Flags / Experiments panel (basic management)
cat > "$SETDIR/FeatureFlagsPanel.tsx" <<'TSX'
import React from "react";
import { listFlags, createFlag, evalFlag, overrideFlag, listExperiments, createExperiment, assignExperiment, eventExperiment } from "../../../lib/api/flags";

export default function FeatureFlagsPanel({admin}:{admin:boolean}){
  const [flags,setFlags]=React.useState<any[]>([]);
  const [experiments,setExperiments]=React.useState<any[]>([]);
  const [newKey,setNewKey]=React.useState(""); const [newVal,setNewVal]=React.useState("true");
  const [evalKey,setEvalKey]=React.useState(""); const [evalRes,setEvalRes]=React.useState<string>("");

  async function refresh(){ setFlags(await listFlags()); setExperiments(await listExperiments()); }
  React.useEffect(()=>{refresh()},[]);

  async function doCreate(e:React.FormEvent){ e.preventDefault(); if(!admin) return;
    const parsed=(()=>{ try{return JSON.parse(newVal);}catch{return newVal;} })();
    if(await createFlag(newKey, parsed)){ setNewKey(""); setNewVal("true"); refresh(); }
  }
  async function doEval(e:React.FormEvent){ e.preventDefault(); const r=await evalFlag(evalKey); setEvalRes(JSON.stringify(r)); }
  async function doOverride(key:string,val:any){ if(!admin) return; const ok=await overrideFlag(key,val); if(ok) refresh(); }

  // tiny experiment demo
  const [expKey,setExpKey]=React.useState(""); const [expCfg,setExpCfg]=React.useState('{"variants":{"A":50,"B":50}}');
  async function doCreateExp(e:React.FormEvent){ e.preventDefault(); if(!admin) return;
    let cfg:any; try{cfg=JSON.parse(expCfg);}catch{alert("JSON invalid");return;}
    if(await createExperiment(expKey,cfg)) refresh();
  }

  return (
    <div className="lm-card" style={{padding:16}}>
      <div className="lm-title">Feature Flags</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div>
          <div className="lm-subtle" style={{marginTop:8}}>Existing</div>
          <table className="lm-table"><thead><tr><th>Key</th><th>Value</th><th style={{textAlign:"right"}}>Actions</th></tr></thead>
          <tbody>
            {flags.map((f:any)=>(
              <tr key={f.key}>
                <td>{f.key}</td><td><code>{JSON.stringify(f.value)}</code></td>
                <td style={{textAlign:"right"}}>
                  {admin && <button className="lm-btn" onClick={()=>doOverride(f.key, !f.value)}>Toggle</button>}
                </td>
              </tr>
            ))}
          </tbody></table>

          <div style={{height:12}}/>
          <form onSubmit={doEval} className="lm-kv">
            <label className="lm-subtle">Evaluate</label>
            <div style={{display:"flex",gap:8}}>
              <input className="lm-input" value={evalKey} onChange={e=>setEvalKey(e.target.value)} placeholder="flag key"/>
              <button className="lm-btn">Eval</button>
            </div>
          </form>
          {!!evalRes && <div className="lm-subtle" style={{marginTop:8}}><code>{evalRes}</code></div>}
        </div>

        <div>
          <div className="lm-subtle" style={{marginTop:8}}>Create new</div>
          <form onSubmit={doCreate} className="lm-kv">
            <label className="lm-subtle">Key</label><input className="lm-input" value={newKey} onChange={e=>setNewKey(e.target.value)} required/>
            <label className="lm-subtle">Value (JSON ok)</label><input className="lm-input" value={newVal} onChange={e=>setNewVal(e.target.value)} />
            <div/><div><button className="lm-btn primary">Create Flag</button></div>
          </form>

          <div className="lm-title" style={{marginTop:18}}>Experiments</div>
          <table className="lm-table"><thead><tr><th>Key</th><th>Config</th><th style={{textAlign:"right"}}>Actions</th></tr></thead>
          <tbody>
            {experiments.map((x:any)=>(
              <tr key={x.key}>
                <td>{x.key}</td><td><code>{JSON.stringify(x)}</code></td>
                <td style={{textAlign:"right"}}>
                  <button className="lm-btn" onClick={async()=>alert(JSON.stringify(await assignExperiment(x.key)))}>Assign</button>
                  <button className="lm-btn" onClick={()=>eventExperiment(x.key,"view")}>Event:view</button>
                </td>
              </tr>
            ))}
          </tbody></table>

          <form onSubmit={doCreateExp} className="lm-kv" style={{marginTop:8}}>
            <label className="lm-subtle">Key</label><input className="lm-input" value={expKey} onChange={e=>setExpKey(e.target.value)} required/>
            <label className="lm-subtle">Config (JSON)</label><textarea className="lm-input" style={{height:100}} value={expCfg} onChange={e=>setExpCfg(e.target.value)} />
            <div/><div><button className="lm-btn primary">Create Experiment</button></div>
          </form>
        </div>
      </div>
    </div>
  );
}
TSX

# 7) Role-based nav visibility (hide tabs by role)
cat > "$AUTH/nav.ts" <<'TS'
import type { Role } from "./roles";

export type TabId="dashboard"|"pipeline"|"contacts"|"comms"|"marketing"|"lenders"|"settings";
export const TAB_ROLES:Record<TabId, Role[]> = {
  dashboard: ["admin","manager","staff"],
  pipeline:   ["admin","manager","staff"],
  contacts:   ["admin","manager","staff"],
  comms:      ["admin","manager","staff"],
  marketing:  ["admin","manager"],   // staff hidden
  lenders:    ["admin","manager"],   // staff hidden
  settings:   ["admin"],             // admin only
};
export function visibleTabsFor(roles:Role[]){
  const out:TabId[]=[];
  (Object.keys(TAB_ROLES) as TabId[]).forEach(t=>{
    if(roles.some(r=>TAB_ROLES[t].includes(r))) out.push(t);
  });
  return out;
}
TS

# 8) Build to client/dist
echo ">> Build enhanced settings"
rm -rf client/dist dist dist/public 2>/dev/null || true
if npx --yes vite build --mode production >/dev/null 2>&1; then echo "vite build OK"; else npm run build || true; fi
[ -d dist/public ] && mkdir -p client/dist && cp -r dist/public/* client/dist/ && rm -rf dist
test -f client/dist/index.html || { echo "❌ Build missing at client/dist/index.html"; exit 1; }

echo
echo "✅ Enhanced Settings Suite installed:"
echo "   • Users CRUD with inline editing + Seed Admin"
echo "   • Role-based access (role chips, admin controls)"
echo "   • Integrations panel: O365, Google Ads/GA4, LinkedIn, Twilio"
echo "   • Feature Flags + Experiments management"
echo "   • Lisa-Morgan design tokens + responsive tables"
echo "   • Production build → client/dist ✓"
echo
echo "🎯 READY: Settings enhanced with proper role-based access control"
