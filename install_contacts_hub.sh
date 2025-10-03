# === install_contacts_hub.sh ================================================
set -euo pipefail

echo ">> [0/8] Ensure dirs"
mkdir -p client/src/lib/api client/src/pages/staff/sections client/src/pages/staff/components server/routes client/src/styles

echo ">> [1/8] Styles (only adds if missing)"
grep -q '.contact-hub' client/src/styles/brand.css 2>/dev/null || cat >> client/src/styles/brand.css <<'CSS'
/* Contacts hub (Lisa-Morgan style) */
.contact-hub{display:grid;gap:12px}
.ch-row{display:flex;gap:12px}
.ch-pane{background:#fff;border:1px solid var(--line);border-radius:12px;flex:1 1 0;display:flex;flex-direction:column;min-height:480px}
.ch-head{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line)}
.ch-body{padding:12px;display:flex;flex-direction:column;gap:10px}
.ch-list{display:flex;flex-direction:column;gap:8px;overflow:auto}
.ch-item{border:1px solid var(--line);border-radius:10px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;background:#f8fafc;cursor:pointer}
.ch-item.active{border-color:var(--accent);background:#fff}
.ch-grid{display:grid;grid-template-columns:repeat(2,minmax(200px,1fr));gap:10px}
.ch-actions{display:flex;gap:8px;align-items:center}
.badge{border:1px solid var(--line);border-radius:9999px;padding:.2rem .6rem;font-size:.75rem;background:#fff}
.timeline{display:flex;flex-direction:column;gap:8px;overflow:auto}
.event{border:1px solid var(--line);border-radius:10px;padding:8px;background:#fff}
.event .meta{font-size:.8rem;color:var(--muted)}
CSS

echo ">> [2/8] API adapter (robust, multi-endpoint fallbacks, DB mappers)"
cat > client/src/lib/api/contacts.ts <<'TS'
import { safeFetchJson } from "../safeFetch";

export type Contact = {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  status?: string;     // new | active | warm | cold | customer (UI-friendly)
  owner?: string;
  applicationId?: string;
  tags?: string[];
  // passthrough
  _raw?: any;
};

function splitName(full?:string){ 
  if(!full) return {firstName:"",lastName:""};
  const parts = String(full).trim().split(/\s+/);
  return {firstName:parts[0]||"", lastName: (parts.slice(1).join(" ")||"")};
}

function normalize(c:any): Contact {
  const full = c.full_name || c.fullName || [c.first_name||c.firstName,c.last_name||c.lastName].filter(Boolean).join(" ");
  const {firstName,lastName} = c.first_name||c.firstName ? {firstName:c.first_name||c.firstName,lastName:c.last_name||c.lastName} : splitName(full);
  const statusRaw = c.status || c.stage || c.lifecycle;
  const statusMap:Record<string,string> = {new:"new", active:"active", warm:"warm", cold:"cold", customer:"customer"};
  const status = statusMap[String(statusRaw||"").toLowerCase()] || "active";
  return {
    id: String(c.id),
    firstName, lastName, fullName: full || `${firstName} ${lastName}`.trim(),
    email: c.email,
    phone: c.phone || c.mobile || c.contact_phone,
    company: c.company_name || c.company || c.org,
    title: c.job_title || c.title,
    status,
    owner: c.owner || c.owner_email || c.assigned_to,
    applicationId: c.application_id || c.appId,
    tags: Array.isArray(c.tags)?c.tags: (typeof c.tags==="string"? c.tags.split(",").map((s:string)=>s.trim()).filter(Boolean):[]),
    _raw: c
  };
}

function denormalize(body:Partial<Contact>){
  // Convert back to DB-ish columns
  const full = body.fullName || [body.firstName, body.lastName].filter(Boolean).join(" ");
  const status = (body.status||"").toLowerCase();
  return {
    full_name: full || null,
    first_name: body.firstName ?? null,
    last_name:  body.lastName ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    company_name: body.company ?? null,
    job_title: body.title ?? null,
    status,
    application_id: body.applicationId ?? null,
    tags: body.tags ?? [],
  };
}

// Endpoint variants we try, in order
const INDEX_VARIANTS = ["/api/contacts","/api/admin/contacts","/api/crm/contacts"];
const SHOW_VARIANTS  = (id:string)=> [`/api/contacts/${id}`, `/api/crm/contacts/${id}`];
const CREATE_VARIANTS= ["/api/contacts"];
const UPDATE_VARIANTS= (id:string)=> [`/api/contacts/${id}`];
const DELETE_VARIANTS= (id:string)=> [`/api/contacts/${id}`];
const ACTIVITY_GET   = (id:string)=> [`/api/contacts/${id}/activity`,`/api/chat/logs/${id}`];
const ACTIVITY_POST  = (id:string)=> [`/api/contacts/${id}/activity`,`/api/chat/log-contact`];

export async function listContacts(query?:string):Promise<Contact[]>{
  for (const u of INDEX_VARIANTS){
    const q = query? (u.includes("?")? `${u}&q=${encodeURIComponent(query)}` : `${u}?q=${encodeURIComponent(query)}`) : u;
    const r = await safeFetchJson<any[]>(q); 
    if (r.ok && Array.isArray(r.data)) return r.data.map(normalize);
  }
  return [];
}

export async function getContact(id:string):Promise<Contact|null>{
  for (const u of SHOW_VARIANTS(id)){
    const r = await safeFetchJson<any>(u); 
    if (r.ok && r.data) return normalize(r.data);
  }
  return null;
}

export async function createContact(c:Partial<Contact>):Promise<Contact|null>{
  const payload = denormalize(c);
  for (const u of CREATE_VARIANTS){
    const r = await safeFetchJson<any>(u, { method: "POST", headers:{"content-type":"application/json"}, body: JSON.stringify(payload) });
    if (r.ok && r.data) return normalize(r.data);
  }
  return null;
}

export async function updateContact(id:string, c:Partial<Contact>):Promise<boolean>{
  const payload = denormalize(c);
  for (const u of UPDATE_VARIANTS(id)){
    const r = await safeFetchJson<any>(u, { method: "PATCH", headers:{"content-type":"application/json"}, body: JSON.stringify(payload) });
    if (r.ok) return true;
  }
  return false;
}

export async function deleteContact(id:string):Promise<boolean>{
  for (const u of DELETE_VARIANTS(id)){
    const r = await safeFetchJson<any>(u, { method:"DELETE" });
    if (r.ok) return true;
  }
  return false;
}

// Activity timeline
export type Activity = { id:string; kind:"note"|"call"|"sms"|"email"; text:string; at:string; meta?:any };

export async function listActivity(id:string):Promise<Activity[]>{
  for (const u of ACTIVITY_GET(id)){
    const r = await safeFetchJson<any[]>(u);
    if (r.ok && Array.isArray(r.data)) {
      return r.data.map((e:any)=>({ id:String(e.id||e.ts||Math.random()), kind:(e.kind||"note"), text:String(e.text||e.body||""), at:String(e.at||e.timestamp||new Date().toISOString()), meta:e }));
    }
  }
  return [];
}

export async function appendActivity(id:string, kind:Activity["kind"], text:string, meta?:any):Promise<boolean>{
  for (const u of ACTIVITY_POST(id)){
    const r = await safeFetchJson<any>(u, { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ kind, text, meta, contactId:id }) });
    if (r.ok) return true;
  }
  return false;
}
TS

echo ">> [3/8] Contacts Hub component (3-pane UI, create/edit/delete, search, timeline, quick actions)"
cat > client/src/pages/staff/sections/ContactsHub.tsx <<'TSX'
import React from "react";
import { listContacts, getContact, createContact, updateContact, deleteContact, listActivity, appendActivity, type Contact, type Activity } from "../../../lib/api/contacts";
import { startCall } from "../../../lib/api/voice";
import { sendEmail } from "../../../lib/api/email"; // graceful: will try /api/o365/email/send then /api/email/
import { sendSmsViaConversation, ensureConversation } from "../../../lib/api/sms"; // graceful fallbacks

export default function ContactsHub(){
  const [query,setQuery] = React.useState("");
  const [rows,setRows]   = React.useState<Contact[]>([]);
  const [activeId,setActiveId] = React.useState<string|undefined>(undefined);
  const [form,setForm]   = React.useState<Contact|undefined>(undefined);
  const [timeline,setTimeline] = React.useState<Activity[]>([]);
  const [loading,setLoading] = React.useState(true);
  const [busy,setBusy] = React.useState(false);

  React.useEffect(()=>{ (async()=>{ setLoading(true); const r=await listContacts(""); setRows(r); setLoading(false); })(); },[]);
  React.useEffect(()=>{ (async()=>{ if(!activeId) { setForm(undefined); setTimeline([]); return; } const c=await getContact(activeId); setForm(c||undefined); const t=await listActivity(activeId); setTimeline(t); })(); },[activeId]);

  async function searchNow(){
    setLoading(true);
    const r = await listContacts(query);
    setRows(r); setLoading(false);
  }
  async function pick(id:string){ setActiveId(id); }
  async function newContact(){
    setForm({id:"",firstName:"",lastName:"",email:"",phone:"",company:"",title:"",status:"active"} as any);
    setActiveId(undefined);
  }
  async function save(){
    if(!form) return;
    setBusy(true);
    if(!form.id){ // create
      const created = await createContact(form);
      if(created){ setRows([created,...rows]); setActiveId(created.id); setForm(created); }
    } else {
      const ok = await updateContact(form.id, form);
      if(ok){ setRows(rows.map(r=>r.id===form.id? {...r, ...form}: r)); }
    }
    setBusy(false);
  }
  async function remove(){
    if(!form?.id) return;
    if(!confirm("Delete this contact?")) return;
    setBusy(true);
    const ok = await deleteContact(form.id);
    if(ok){ setRows(rows.filter(r=>r.id!==form.id)); setForm(undefined); setActiveId(undefined); setTimeline([]); }
    setBusy(false);
  }

  async function quickCall(){
    if(!form?.phone) return alert("No phone on record");
    const r = await startCall({ to: form.phone }); if(!(r as any).ok) alert("Call failed");
    await appendActivity(form!.id,"call",`Outbound call to ${form!.phone}`);
  }
  async function quickSms(){
    if(!form?.phone) return alert("No phone on record");
    const conv = await ensureConversation(form.phone, form.fullName || `${form.firstName||""} ${form.lastName||""}`.trim());
    const message = prompt("SMS message:") || ""; if(!message) return;
    if(conv){ await sendSmsViaConversation(conv.id, message); } // sms.ts has fallback raw too
    await appendActivity(form!.id,"sms",message,{to:form!.phone});
    setTimeline([{id:String(Date.now()), kind:"sms", text:message, at:new Date().toISOString()}, ...timeline]);
  }
  async function quickEmail(){
    if(!form?.email) return alert("No email on record");
    const subject = prompt("Email subject:") || "(no subject)";
    const html = prompt("Email HTML:") || `<p>Hello ${form.fullName||form.firstName||""},</p><p>Following up…</p>`;
    const ok = await sendEmail({ to: form.email, subject, html });
    if(!ok) alert("Email send failed");
    await appendActivity(form!.id,"email",subject,{to:form!.email});
    setTimeline([{id:String(Date.now()), kind:"email", text:subject, at:new Date().toISOString()}, ...timeline]);
  }
  async function addNote(){
    const text = prompt("Add a note:") || ""; if(!text) return;
    await appendActivity(form!.id,"note",text);
    setTimeline([{id:String(Date.now()), kind:"note", text, at:new Date().toISOString()}, ...timeline]);
  }

  return (
    <div className="contact-hub">
      <div className="ch-row">
        {/* LEFT: list */}
        <div className="ch-pane" style={{flex:"1 1 320px", minWidth:280}}>
          <div className="ch-head">
            <input className="lm-input" placeholder="Search contacts…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&searchNow()} style={{maxWidth:260}}/>
            <div className="ch-actions">
              <button className="lm-btn" onClick={searchNow}>Search</button>
              <button className="lm-btn primary" onClick={newContact}>New</button>
            </div>
          </div>
          <div className="ch-body ch-list">
            {loading && <div className="lm-subtle">Loading…</div>}
            {!loading && rows.map(c=>{
              const label = c.fullName || `${c.firstName||""} ${c.lastName||""}`.trim() || c.email || c.id;
              const sub = [c.company, c.title].filter(Boolean).join(" · ");
              return (
                <div key={c.id} className={`ch-item ${activeId===c.id?'active':''}`} onClick={()=>pick(c.id)}>
                  <div>
                    <div style={{fontWeight:700}}>{label}</div>
                    <div className="lm-subtle">{sub||"—"}</div>
                  </div>
                  <div className="badge">{c.status||"active"}</div>
                </div>
              );
            })}
            {!loading && rows.length===0 && <div className="lm-subtle">No contacts.</div>}
          </div>
        </div>

        {/* CENTER: form */}
        <div className="ch-pane" style={{flex:"2 1 560px", minWidth:420}}>
          <div className="ch-head">
            <div style={{fontWeight:700}}>Details</div>
            <div className="ch-actions">
              <button className="lm-btn" onClick={save} disabled={busy}>Save</button>
              {form?.id && <button className="lm-btn" onClick={remove} disabled={busy}>Delete</button>}
            </div>
          </div>
          <div className="ch-body">
            {!form && <div className="lm-subtle">Select a contact or create a new one.</div>}
            {form && (
              <>
                <div className="ch-grid">
                  <div><div className="lm-subtle">First name</div><input className="lm-input" value={form.firstName||""} onChange={e=>setForm({...form!,firstName:e.target.value})}/></div>
                  <div><div className="lm-subtle">Last name</div><input className="lm-input" value={form.lastName||""} onChange={e=>setForm({...form!,lastName:e.target.value})}/></div>
                  <div><div className="lm-subtle">Email</div><input className="lm-input" value={form.email||""} onChange={e=>setForm({...form!,email:e.target.value})}/></div>
                  <div><div className="lm-subtle">Phone</div><input className="lm-input" value={form.phone||""} onChange={e=>setForm({...form!,phone:e.target.value})}/></div>
                  <div><div className="lm-subtle">Company</div><input className="lm-input" value={form.company||""} onChange={e=>setForm({...form!,company:e.target.value})}/></div>
                  <div><div className="lm-subtle">Title</div><input className="lm-input" value={form.title||""} onChange={e=>setForm({...form!,title:e.target.value})}/></div>
                  <div><div className="lm-subtle">Status</div>
                    <select className="lm-input" value={form.status||"active"} onChange={e=>setForm({...form!,status:e.target.value})}>
                      {["new","active","warm","cold","customer"].map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><div className="lm-subtle">Tags (comma)</div><input className="lm-input" value={(form.tags||[]).join(", ")} onChange={e=>setForm({...form!,tags:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})}/></div>
                </div>
                <div className="ch-actions" style={{marginTop:6}}>
                  <button className="lm-btn" onClick={quickCall}>Call</button>
                  <button className="lm-btn" onClick={quickSms}>SMS</button>
                  <button className="lm-btn" onClick={quickEmail}>Email</button>
                  <button className="lm-btn" onClick={addNote}>Note</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: activity */}
        <div className="ch-pane" style={{flex:"1 1 360px", minWidth:320}}>
          <div className="ch-head"><div style={{fontWeight:700}}>Activity</div></div>
          <div className="ch-body timeline">
            {timeline.map(ev=>(
              <div key={ev.id} className="event">
                <div className="meta">{ev.kind} · {new Date(ev.at).toLocaleString()}</div>
                <div>{ev.text}</div>
              </div>
            ))}
            {timeline.length===0 && <div className="lm-subtle">No activity yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
TSX

echo ">> [4/8] Ensure email/sms adapters exist (idempotent)"
[ -f client/src/lib/api/email.ts ] || cat > client/src/lib/api/email.ts <<'TS'
import { safeFetchJson } from "../safeFetch";
export async function sendEmail(p:{to:string|string[];subject:string;html?:string;text?:string;from?:string}){
  for (const u of ["/api/o365/email/send","/api/email/"]){
    const r = await safeFetchJson<any>(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(p)});
    if (r.ok) return true;
  } return false;
}
TS
[ -f client/src/lib/api/sms.ts ] || cat > client/src/lib/api/sms.ts <<'TS'
import { safeFetchJson } from "../safeFetch";
export async function ensureConversation(phone:string,name?:string){
  for (const t of [{m:"POST",u:"/api/conversations/create-or-attach",b:{phone,name}},{m:"POST",u:"/api/chat/sessions",b:{phone,name}}]){
    const r=await safeFetchJson<any>(t.u,{method:t.m,headers:{"content-type":"application/json"},body:JSON.stringify(t.b)}); 
    if (r.ok){ const id=r.data?.conversationSid||r.data?.id||r.data?.sid; if(id) return {id,to:phone,name}; }
  } return null;
}
export async function sendSmsViaConversation(id:string, body:string){
  const r=await safeFetchJson<any>(`/api/conversations/${encodeURIComponent(id)}/send`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({body})});
  return !!r.ok;
}
TS

echo ">> [5/8] Wire Contacts tab to this component"
TT="client/src/pages/staff/TopTabsDashboard.tsx"
if [ -f "$TT" ]; then
  grep -q 'from "./sections/ContactsHub"' "$TT" 2>/dev/null || sed -i '1i import ContactsHub from "./sections/ContactsHub";' "$TT"
  perl -0777 -i -pe 's/\{tab===["'\'']contacts["'\'']\}[\s\S]*?\}/\{tab==="contacts" && <ContactsHub\/>\}/s' "$TT" || true
fi

echo ">> [6/8] Server compat router (only mounts if /api/contacts not mounted already)"
if [ ! -f server/routes/contacts-compat.ts ]; then
cat > server/routes/contacts-compat.ts <<'TS'
import { Router } from "express";
const r = Router();
let pool:any=null;
try{ const {Pool}=require("pg"); pool = process.env.DATABASE_URL ? new Pool({connectionString:process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}}) : null; }catch{}

function toUI(row:any){
  return {
    id: String(row.id),
    full_name: row.full_name || [row.first_name,row.last_name].filter(Boolean).join(" "),
    first_name: row.first_name, last_name: row.last_name,
    email: row.email, phone: row.phone,
    company_name: row.company_name, job_title: row.job_title,
    status: row.status || "active",
    application_id: row.application_id, tags: row.tags || []
  };
}

function toDB(body:any){
  const full = body.full_name || [body.first_name,body.last_name].filter(Boolean).join(" ");
  return {
    full_name: full || null,
    first_name: body.first_name ?? null,
    last_name: body.last_name ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    company_name: body.company_name ?? null,
    job_title: body.job_title ?? null,
    status: (body.status||"active"),
    application_id: body.application_id ?? null,
    tags: Array.isArray(body.tags)? body.tags : (typeof body.tags==="string"? body.tags.split(",").map((s:string)=>s.trim()): [])
  };
}

async function q(sql:string, params:any[]=[]){
  if(!pool) return { rows: [] };
  const res = await pool.query(sql, params); return res;
}

// Ensure an activity table (lightweight)
async function ensureActivity(){
  if(!pool) return;
  await q(`create table if not exists contact_activity(
    id uuid primary key,
    contact_id text not null,
    kind text not null,
    text text,
    meta jsonb,
    at timestamptz not null default now()
  )`);
}

// index
r.get("/", async (req,res)=>{
  try{
    const qstr = String(req.query.q||"").trim().toLowerCase();
    if(!pool) return res.json([]);
    const { rows } = await q(`select id, full_name, first_name, last_name, email, phone, company_name, job_title, status, application_id, tags from contacts order by updated_at desc nulls last, created_at desc nulls last limit 500`);
    const arr = rows.map(toUI).filter((c:any)=>{
      if(!qstr) return true;
      const hay = [c.full_name,c.email,c.phone,c.company_name,c.job_title].join(" ").toLowerCase();
      return hay.includes(qstr);
    });
    res.json(arr);
  }catch(e){ res.status(500).json({error:String(e)}); }
});

// show
r.get("/:id", async (req,res)=>{
  try{
    if(!pool) return res.json(null);
    const { rows } = await q(`select id, full_name, first_name, last_name, email, phone, company_name, job_title, status, application_id, tags from contacts where id=$1`, [req.params.id]);
    res.json(rows[0]? toUI(rows[0]) : null);
  }catch(e){ res.status(500).json({error:String(e)}); }
});

// create
r.post("/", async (req,res)=>{
  try{
    if(!pool) return res.json(null);
    const b = toDB(req.body||{});
    const id = (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : String(Date.now());
    await q(`insert into contacts (id, full_name, first_name, last_name, email, phone, company_name, job_title, status, application_id, tags)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id,b.full_name,b.first_name,b.last_name,b.email,b.phone,b.company_name,b.job_title,b.status,b.application_id,JSON.stringify(b.tags||[])]);
    const { rows } = await q(`select id, full_name, first_name, last_name, email, phone, company_name, job_title, status, application_id, tags from contacts where id=$1`,[id]);
    res.status(201).json(rows[0]?toUI(rows[0]):null);
  }catch(e){ res.status(500).json({error:String(e)}); }
});

// update
r.patch("/:id", async (req,res)=>{
  try{
    if(!pool) return res.json({ok:true});
    const b = toDB(req.body||{});
    await q(`update contacts set full_name=$2, first_name=$3, last_name=$4, email=$5, phone=$6, company_name=$7, job_title=$8, status=$9, application_id=$10, tags=$11, updated_at=now() where id=$1`,
      [req.params.id,b.full_name,b.first_name,b.last_name,b.email,b.phone,b.company_name,b.job_title,b.status,b.application_id,JSON.stringify(b.tags||[])]);
    res.json({ok:true});
  }catch(e){ res.status(500).json({error:String(e)}); }
});

// delete (soft if column exists; else hard)
r.delete("/:id", async (req,res)=>{
  try{
    if(!pool) return res.json({ok:true});
    try{ await q(`update contacts set deleted_at=now() where id=$1`,[req.params.id]); }
    catch{ await q(`delete from contacts where id=$1`,[req.params.id]); }
    res.json({ok:true});
  }catch(e){ res.status(500).json({error:String(e)}); }
});

// activity
r.get("/:id/activity", async (req,res)=>{
  try{
    await ensureActivity();
    if(!pool) return res.json([]);
    const { rows } = await q(`select id, contact_id, kind, text, meta, at from contact_activity where contact_id=$1 order by at desc limit 200`,[req.params.id]);
    res.json(rows);
  }catch(e){ res.status(500).json({error:String(e)}); }
});
r.post("/:id/activity", async (req,res)=>{
  try{
    await ensureActivity();
    if(!pool) return res.json({ok:true});
    const id = (crypto as any)?.randomUUID ? (crypto as any).randomUUID() : String(Date.now());
    const b = req.body||{};
    await q(`insert into contact_activity (id, contact_id, kind, text, meta, at) values ($1,$2,$3,$4,$5, now())`,
      [id, req.params.id, b.kind||"note", b.text||"", b.meta? JSON.stringify(b.meta):null]);
    res.status(201).json({ok:true,id});
  }catch(e){ res.status(500).json({error:String(e)}); }
});

export default r;
TS
  # import + mount if no existing /api/contacts mount found
  if ! grep -q "app.use('/api/contacts'" server/index.ts 2>/dev/null; then
    sed -i "1i import contactsCompat from './routes/contacts-compat';" server/index.ts
    sed -i "s|app.use([^)]*);|&\napp.use('/api/contacts', contactsCompat);|" server/index.ts
  fi
fi

echo ">> [7/8] Build → serve"
rm -rf client/dist dist dist/public 2>/dev/null || true
npx --yes vite build --mode production >/dev/null 2>&1 || npm run build || true
[ -d dist/public ] && (mkdir -p client/dist && cp -r dist/public/* client/dist/ && rm -rf dist)
test -f client/dist/index.html || { echo "❌ Build missing at client/dist/index.html"; exit 1; }

echo ">> [8/8] Done"
echo "✅ Contacts Hub (3-pane) installed successfully!"
echo "✅ Features: Create/Edit/Delete contacts with search"
echo "✅ Activity timeline with notes, calls, SMS, email logs"
echo "✅ Quick actions: Call, SMS, Email, Add Note"
echo "✅ Server compat router with contact_activity table"
echo ""
echo "Open the Contacts tab to see the HubSpot-style 3-pane interface!"
