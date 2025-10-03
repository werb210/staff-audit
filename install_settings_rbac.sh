set -euo pipefail

echo ">> [0/9] Ensure dirs"
mkdir -p client/src/lib/api client/src/lib client/src/pages/staff/sections client/src/pages/staff/components server/routes client/src/styles

echo ">> [1/9] Brand helpers (chips/tables) — idempotent"
grep -q '.lm-table' client/src/styles/brand.css 2>/dev/null || cat >> client/src/styles/brand.css <<'CSS'
.lm-table { width:100%; border-collapse:separate; border-spacing:0; border:1px solid var(--line); border-radius:12px; overflow:hidden; background:#fff; }
.lm-table th, .lm-table td { padding:.65rem .8rem; border-bottom:1px solid var(--line); }
.lm-table th { background:#f8fafc; text-align:left; font-weight:600; }
.lm-table tr:last-child td { border-bottom:none; }
.lm-badge { padding:.18rem .6rem; border-radius:999px; border:1px solid var(--line); background:#fff; font-size:.75rem; }
.lm-badge.admin{ background:#dbeafe; border-color:#bfdbfe; color:#1e3a8a; }
.lm-badge.user{ background:#e5e7eb; }
.lm-badge.marketing{ background:#fef9c3; border-color:#fde68a; }
.lm-badge.lender{ background:#dcfce7; border-color:#86efac; }
.lm-badge.referrer{ background:#f5d0fe; border-color:#f0abfc; }
.lm-right{ text-align:right }
CSS

echo ">> [2/9] RBAC utility (role→tabs map, view-as helper)"
cat > client/src/lib/rbac.ts <<'TS'
export type Role = "admin"|"user"|"marketing"|"lender"|"referrer";

export const ROLE_TABS: Record<Role, string[]> = {
  admin:     ["dashboard","pipeline","contacts","comms","marketing","lenders","settings"],
  user:      ["dashboard","pipeline","contacts","comms","lenders"],
  marketing: ["dashboard","contacts","marketing","comms"],
  lender:    ["dashboard","lenders","contacts"],
  referrer:  ["dashboard","contacts"]
};

export function currentRole(): Role {
  // 1) Admin "view-as" override for preview
  const as = (localStorage.getItem("viewAsRole")||"").toLowerCase();
  if (["admin","user","marketing","lender","referrer"].includes(as)) return as as Role;
  // 2) From roles claim (comma list) or token payload you already store
  const roles = (localStorage.getItem("roles")||"").toLowerCase().split(",").map(s=>s.trim()).filter(Boolean);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("marketing")) return "marketing";
  if (roles.includes("lender")) return "lender";
  if (roles.includes("referrer")) return "referrer";
  return "user";
}
export function tabAllowed(tab:string){ return ROLE_TABS[currentRole()].includes(tab); }
TS

echo ">> [3/9] Users API adapter (tolerant to multiple backends)"
cat > client/src/lib/api/users.ts <<'TS'
import { safeFetchJson } from "../safeFetch";

export type UserRow = {
  id: string;
  name?: string;
  full_name?: string;
  email: string;
  phone?: string;
  mobile?: string;
  role: "admin"|"user"|"marketing"|"lender"|"referrer";
  active?: boolean;
  created_at?: string;
};

const LIST_TRIES = ["/api/rbac/auth/users","/api/admin/users","/api/users"];
const CREATE_TRIES = [
  {m:"POST",u:"/api/rbac/auth/register"},
  {m:"POST",u:"/api/admin/users"},
  {m:"POST",u:"/api/users"}
];
const PATCH_TRIES = (id:string)=>[
  {m:"PATCH",u:`/api/rbac/auth/users/${id}`},
  {m:"PATCH",u:`/api/admin/users/${id}`},
  {m:"PATCH",u:`/api/users/${id}`}
];
const DEL_TRIES = (id:string)=>[
  {m:"DELETE",u:`/api/rbac/auth/users/${id}`},
  {m:"DELETE",u:`/api/admin/users/${id}`},
  {m:"DELETE",u:`/api/users/${id}`}
];

export async function listUsers():Promise<UserRow[]>{
  for(const u of LIST_TRIES){
    const r = await safeFetchJson<UserRow[]>(u);
    if(r.ok && Array.isArray(r.data)) return r.data;
  }
  return [];
}

export async function createUser(input: {name?:string; email:string; phone?:string; role:UserRow["role"]; password?:string; active?:boolean;}){
  const payload:any = {
    name: input.name,
    full_name: input.name,
    email: input.email,
    phone: input.phone,
    mobile: input.phone,
    role: input.role,
    active: input.active ?? true,
    password: input.password // your server may ignore if Verify-only later
  };
  for(const t of CREATE_TRIES){
    const r = await safeFetchJson<any>(t.u, { method:t.m, headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
    if(r.ok) return true;
  }
  return false;
}

export async function updateUser(id:string, patch: Partial<UserRow>){
  const body:any = { ...patch, name: patch.name ?? patch.full_name };
  for(const t of PATCH_TRIES(id)){
    const r = await safeFetchJson<any>(t.u, { method:t.m, headers:{ "content-type":"application/json" }, body: JSON.stringify(body) });
    if(r.ok) return true;
  }
  return false;
}

export async function deleteUser(id:string){
  for(const t of DEL_TRIES(id)){
    const r = await safeFetchJson<any>(t.u, { method:t.m });
    if(r.ok) return true;
  }
  return false;
}
TS

echo ">> [4/9] Settings → Users screen (CRUD + Admin 'view-as')"
cat > client/src/pages/staff/sections/Settings.tsx <<'TSX'
import React from "react";
import { listUsers, createUser, updateUser, deleteUser, type UserRow } from "../../../lib/api/users";
import { ROLE_TABS, currentRole } from "../../../lib/rbac";

function ViewAs(){
  const [val,setVal]=React.useState(localStorage.getItem("viewAsRole")||"");
  function set(v:string){ setVal(v); if(v) localStorage.setItem("viewAsRole", v); else localStorage.removeItem("viewAsRole"); location.reload(); }
  return (
    <div style={{display:"flex", gap:8, alignItems:"center"}}>
      <span className="lm-subtle">View as</span>
      <select className="lm-input" style={{maxWidth:200}} value={val} onChange={e=>set(e.target.value)}>
        <option value="">(actual role)</option>
        <option value="admin">Admin</option>
        <option value="user">User</option>
        <option value="marketing">Marketing</option>
        <option value="lender">Lender</option>
        <option value="referrer">Referrer</option>
      </select>
      <span className="lm-subtle">Tabs: {ROLE_TABS[(val||currentRole()) as any].join(", ")}</span>
    </div>
  );
}

export default function Settings(){
  const [tab,setTab]=React.useState<"users"|"integrations"|"flags">("users");
  return (
    <div className="lm-card" style={{padding:0}}>
      <div className="lm-toolbar">
        <div className="lm-title">Settings</div>
        {currentRole()==="admin" && <ViewAs/>}
      </div>
      <div className="lm-tabs">
        <button className={`lm-tab ${tab==="users"?"active":""}`} onClick={()=>setTab("users")}>Users</button>
        <button className={`lm-tab ${tab==="integrations"?"active":""}`} onClick={()=>setTab("integrations")}>Integrations</button>
        <button className={`lm-tab ${tab==="flags"?"active":""}`} onClick={()=>setTab("flags")}>Flags</button>
      </div>
      <div className="lm-pane-body">
        {tab==="users" && <UsersPane/>}
        {tab==="integrations" && <IntegrationsPane/>}
        {tab==="flags" && <FlagsPane/>}
      </div>
    </div>
  );
}

function UsersPane(){
  const [rows,setRows]=React.useState<UserRow[]>([]);
  const [q,setQ]=React.useState("");
  const [form,setForm]=React.useState({name:"",email:"",phone:"",role:"user",password:""} as any);
  const [busy,setBusy]=React.useState(false);

  async function load(){ setRows(await listUsers()); }
  React.useEffect(()=>{ load(); },[]);

  async function onCreate(e:React.FormEvent){
    e.preventDefault(); setBusy(true);
    const ok = await createUser(form);
    setBusy(false);
    if(ok){ setForm({name:"",email:"",phone:"",role:"user",password:""}); load(); } else alert("Create failed");
  }

  async function onInlineUpdate(id:string, patch:Partial<UserRow>){
    if(!(await updateUser(id,patch))) alert("Update failed"); else load();
  }
  async function onDelete(id:string){
    if(confirm("Delete user?")){ if(!(await deleteUser(id))) alert("Delete failed"); else load(); }
  }

  const filtered = rows.filter(r => (r.name||r.full_name||"").toLowerCase().includes(q.toLowerCase()) || (r.email||"").toLowerCase().includes(q.toLowerCase()));

  function badge(role:any){ return <span className={`lm-badge ${String(role)}`}>{String(role)}</span>; }

  return (
    <div style={{display:"grid", gap:12}}>
      <form onSubmit={onCreate} className="lm-card" style={{padding:12, display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10}}>
        <input className="lm-input" placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <input className="lm-input" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
        <input className="lm-input" placeholder="Mobile (for Verify)" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
        <select className="lm-input" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
          <option value="admin">Admin</option>
          <option value="user">User</option>
          <option value="marketing">Marketing</option>
          <option value="lender">Lender</option>
          <option value="referrer">Referrer</option>
        </select>
        <input className="lm-input" placeholder="(Optional) Temp password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
        <button className="lm-btn primary" disabled={busy}>Create</button>
      </form>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <input className="lm-input" style={{maxWidth:320}} placeholder="Search users…" value={q} onChange={e=>setQ(e.target.value)} />
        <div className="lm-subtle">Total: {rows.length}</div>
      </div>

      <table className="lm-table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th className="lm-right">Actions</th></tr></thead>
        <tbody>
          {filtered.map(u=>(
            <tr key={u.id}>
              <td>
                <input className="lm-input" defaultValue={u.name||u.full_name||""}
                  onBlur={e=>{ const v=e.currentTarget.value.trim(); if(v && v!==(u.name||u.full_name||"")) onInlineUpdate(u.id,{name:v,full_name:v});}}/>
              </td>
              <td>{u.email}</td>
              <td>
                <input className="lm-input" defaultValue={u.phone||u.mobile||""}
                  onBlur={e=>{ const v=e.currentTarget.value.trim(); if(v!==(u.phone||u.mobile||"")) onInlineUpdate(u.id,{phone:v,mobile:v});}}/>
              </td>
              <td>
                <select className="lm-input" defaultValue={u.role}
                  onChange={e=>onInlineUpdate(u.id,{role: e.target.value as any})}>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                  <option value="marketing">Marketing</option>
                  <option value="lender">Lender</option>
                  <option value="referrer">Referrer</option>
                </select>
              </td>
              <td className="lm-right">
                {badge(u.role)}
                <button className="lm-btn" style={{marginLeft:".5rem"}} onClick={()=>onDelete(u.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {filtered.length===0 && <tr><td colSpan={5} className="lm-subtle">No users.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function IntegrationsPane(){
  return (
    <div className="lm-card" style={{padding:12, display:"grid", gap:10}}>
      <div className="lm-subtle">Connect external services (placeholders; wiring later):</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        <div className="lm-card" style={{padding:12}}>
          <div className="lm-title" style={{fontSize:"1rem"}}>Microsoft 365</div>
          <button className="lm-btn" onClick={()=>alert("Wire /api/o365/oauth/start when ready")}>Connect</button>
        </div>
        <div className="lm-card" style={{padding:12}}>
          <div className="lm-title" style={{fontSize:"1rem"}}>Google Analytics</div>
          <button className="lm-btn" onClick={()=>alert("Wire GA OAuth when ready")}>Connect</button>
        </div>
        <div className="lm-card" style={{padding:12}}>
          <div className="lm-title" style={{fontSize:"1rem"}}>Google Ads</div>
          <button className="lm-btn" onClick={()=>alert("Wire Google Ads when ready")}>Connect</button>
        </div>
      </div>
    </div>
  );
}

function FlagsPane(){
  const [flags]=React.useState([
    {key:"pipeline_auto_stage",name:"Auto-stage Pipeline",value:true,desc:"Automatically move apps between stages"},
    {key:"lender_recommendations",name:"AI Lender Match",value:true,desc:"Show ML-powered lender suggestions"},
    {key:"document_ocr",name:"OCR Processing",value:false,desc:"Extract data from uploaded documents"},
    {key:"twilio_sms",name:"SMS Notifications",value:true,desc:"Send SMS updates to applicants"}
  ]);

  return (
    <div className="lm-card" style={{padding:12, display:"grid", gap:10}}>
      <div className="lm-subtle">Feature flags (read-only demo; wire /api/flags for live control):</div>
      <table className="lm-table">
        <thead><tr><th>Feature</th><th>Status</th><th>Description</th></tr></thead>
        <tbody>
          {flags.map(f=>(
            <tr key={f.key}>
              <td style={{fontWeight:600}}>{f.name}</td>
              <td><span className={`lm-badge ${f.value?"admin":"user"}`}>{f.value?"ON":"OFF"}</span></td>
              <td className="lm-subtle">{f.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
TSX

echo ">> [5/9] RBAC server routes (compatible with existing users table)"
cat > server/routes/rbac-users.ts <<'TS'
import { Router } from "express";
const r = Router();

// Tolerant user list endpoint
r.get("/auth/users", async (req, res) => {
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    const result = await client.query(`
      SELECT 
        id,
        full_name as name,
        email,
        phone,
        role,
        created_at
      FROM users 
      ORDER BY created_at DESC
    `);
    
    const users = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      full_name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role || 'user',
      active: true,
      created_at: row.created_at
    }));
    
    await client.end();
    res.json(users);
  } catch (error) {
    console.error('[rbac-users] List error:', error);
    res.json([]);
  }
});

// Create user endpoint
r.post("/auth/register", async (req, res) => {
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    const { name, full_name, email, phone, role = 'user', password } = req.body;
    const displayName = name || full_name || email.split('@')[0];
    
    const result = await client.query(`
      INSERT INTO users (full_name, email, phone, role) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id
    `, [displayName, email, phone, role]);
    
    await client.end();
    res.json({ id: result.rows[0].id, success: true });
  } catch (error) {
    console.error('[rbac-users] Create error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update user endpoint
r.patch("/auth/users/:id", async (req, res) => {
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    const { id } = req.params;
    const { name, full_name, phone, role } = req.body;
    const displayName = name || full_name;
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (displayName) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(displayName);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (role) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    
    if (updates.length > 0) {
      values.push(id);
      await client.query(`
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE id = $${paramCount}
      `, values);
    }
    
    await client.end();
    res.json({ success: true });
  } catch (error) {
    console.error('[rbac-users] Update error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete user endpoint
r.delete("/auth/users/:id", async (req, res) => {
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    const { id } = req.params;
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    
    await client.end();
    res.json({ success: true });
  } catch (error) {
    console.error('[rbac-users] Delete error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default r;
TS

echo ">> [6/9] Update main nav to use RBAC gating"
# This will be handled separately to preserve existing nav structure

echo ">> [7/9] Add Settings tab styles"
grep -q '.lm-tabs' client/src/styles/brand.css 2>/dev/null || cat >> client/src/styles/brand.css <<'CSS'
.lm-tabs { display:flex; border-bottom:1px solid var(--line); }
.lm-tab { padding:.75rem 1.2rem; border:none; background:none; cursor:pointer; color:var(--text-secondary); border-bottom:2px solid transparent; transition:all .2s ease; }
.lm-tab:hover { color:var(--text-primary); background:#f8fafc; }
.lm-tab.active { color:var(--accent); border-bottom-color:var(--accent); background:#fff; }
.lm-pane-body { padding:1.5rem; }
CSS

echo ">> [8/9] Mount RBAC routes in server"
echo "Will be handled in next step"

echo ">> [9/9] Complete"
echo "Settings → Users module installed successfully!"
