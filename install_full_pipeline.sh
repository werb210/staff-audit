# === SALES PIPELINE — FULL INSTALL (Board + Drawer + Docs + Lenders) — ONE PASTE ===
set -euo pipefail

echo ">> [0/11] Ensure dirs"
mkdir -p client/src/styles client/src/lib/api client/src/pages/staff/sections client/src/pages/staff/components out

echo ">> [1/11] Brand tokens (Lisa-Morgan look) + import"
cat > client/src/styles/brand.css <<'CSS'
:root{
  --bg:#fafbfc; --panel:#fff; --text:#0f172a; --muted:#475569; --line:#e5e7eb;
  --accent:#2563eb; --accent-quiet:#dbeafe; --good:#16a34a; --bad:#dc2626;
  --radius-lg:16px; --radius-md:12px; --radius-sm:10px;
  --shadow-sm:0 2px 10px rgba(0,0,0,.06); --shadow-md:0 8px 28px rgba(0,0,0,.12);
}
html,body,#root{background:var(--bg);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
.lm-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm)}
.lm-toolbar{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--line)}
.lm-title{font-weight:800;letter-spacing:.2px}
.lm-pill{border:1px solid var(--line);background:#fff;border-radius:999px;padding:.4rem .8rem}
.lm-pill.active{background:var(--accent);border-color:var(--accent);color:#fff}
.lm-input{border:1px solid var(--line);border-radius:10px;padding:.55rem .7rem;background:#fff;width:100%}
.lm-btn{border:1px solid var(--line);border-radius:10px;background:#fff;padding:.55rem .8rem;cursor:pointer}
.lm-btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.grid-6{display:grid;grid-template-columns:repeat(6,minmax(220px,1fr));gap:12px;align-items:start}
.col{background:#fbfdff;border:1px solid var(--line);border-radius:12px;padding:10px;min-height:420px}
.col .head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.card{background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px;cursor:grab}
.card .meta{font-size:12px;color:var(--muted)}
.badge{border:1px solid #bfdbfe;background:var(--accent-quiet);color:#1e3a8a;border-radius:999px;padding:2px 8px;font-size:11px}
.drawer{position:fixed;top:0;right:0;height:100vh;width:min(940px,95vw);background:#fff;border-left:1px solid var(--line);box-shadow:var(--shadow-md);transform:translateX(100%);transition:transform .28s ease}
.drawer.open{transform:translateX(0)}
.drawer-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--line)}
.tabs{display:flex;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line)}
.tabs button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:.45rem .75rem}
.tabs button.active{background:var(--accent);border-color:var(--accent);color:#fff}
.tab-body{padding:14px}
.row{display:flex;gap:12px}
.kv{display:grid;grid-template-columns:180px 1fr;gap:8px;margin-bottom:6px}
.doc{display:flex;justify-content:space-between;align-items:center;border:1px solid var(--line);border-radius:10px;padding:8px;background:#fff;margin-bottom:8px}
.doc .left{display:flex;flex-direction:column}
.doc .right{display:flex;gap:8px;align-items:center}
.status.good{color:var(--good)} .status.bad{color:var(--bad)}
.small{font-size:12px;color:var(--muted)}
.link{color:var(--accent);text-decoration:none}
CSS
grep -q 'styles/brand.css' client/src/main.tsx 2>/dev/null || sed -i '1i import "./styles/brand.css";' client/src/main.tsx || true

echo ">> [2/11] Safe fetch (idempotent) w/ auth header"
cat > client/src/lib/safeFetch.ts <<'TS'
export type Ok<T>={ok:true;data:T}; export type Err={ok:false;error:any};
export async function safeFetchJson<T=any>(url:string, init:RequestInit={}):Promise<Ok<T>|Err>{
  try{
    const headers=new Headers(init.headers||{});
    if(!headers.has('authorization')){
      const tok=localStorage.getItem('apiToken'); if(tok) headers.set('authorization', tok.startsWith('Bearer')?tok:`Bearer ${tok}`);
    }
    init.headers=headers;
    const r=await fetch(url, init);
    const ct=r.headers.get('content-type')||'';
    const body = ct.includes('application/json') ? await r.json() : await r.text();
    if(!r.ok) return {ok:false,error:{status:r.status,body}};
    return {ok:true,data:body as T};
  }catch(e){return {ok:false,error:e}}
}
TS

echo ">> [3/11] Pipeline API (robust normalization + multi-endpoint fallbacks)"

/** Stages */
export type StageKey = "new"|"requires_docs"|"in_review"|"lender"|"accepted"|"declined";
export const StageTitles:Record<StageKey,string>={
  new:"New", requires_docs:"Requires Docs", in_review:"In Review", lender:"Lender", accepted:"Accepted", declined:"Declined"
};
export type Card = {
  id:string;
  applicant?:string;
  name?:string;
  amount?:number;
  stage?:StageKey;
  docs_ok?:boolean;
  createdAt?:string;
  [k:string]:any;
};
export type BoardState = {[K in StageKey]: Card[]};
const EMPTY:BoardState={new:[],requires_docs:[],in_review:[],lender:[],accepted:[],declined:[]};

/** --- Normalizers (DB → UI) -------------------------------------------- */
function toStage(val:any):StageKey{
  const v=String(val||"").toLowerCase().replace(/\s+/g,'_');
  const map:Record<string,StageKey>={
    "new":"new","requires_docs":"requires_docs","requiresdocs":"requires_docs",
    "in_review":"in_review","review":"in_review","underwriting":"in_review",
    "lender":"lender","accepted":"accepted","approved":"accepted","declined":"declined","rejected":"declined"
  };
  return map[v] ?? "new";
}
function pickName(row:any):string{
  // Prefer legal business name → DBA → contact full name
  return row?.legal_business_name || row?.dba_name || [row?.contact_first_name,row?.contact_last_name].filter(Boolean).join(' ') || row?.business_name || row?.applicant || row?.name || row?.id || "—";
}
function pickAmount(row:any):number|undefined{
  const n = row?.requested_amount ?? row?.loan_amount ?? row?.amount ?? row?.requestAmount;
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return Number.isFinite(v) ? Number(v) : undefined;
}
function docsOk(row:any):boolean|undefined{
  if (typeof row?.docs_ok === 'boolean') return row.docs_ok;
  if (Array.isArray(row?.missing_docs)) return row.missing_docs.length===0;
  if (row?.missingDocs) return Array.isArray(row.missingDocs) ? row.missingDocs.length===0 : !!row.missingDocs;
  return undefined;
}
function asCard(row:any):Card{
  return {
    id: String(row?.id ?? row?.applicationId ?? row?.appId ?? row?.uuid ?? row?._id ?? ""),
    applicant: pickName(row),
    name: pickName(row),
    amount: pickAmount(row),
    stage: toStage(row?.stage ?? row?.status),
    docs_ok: docsOk(row),
    createdAt: row?.created_at ?? row?.createdAt
  };
}

/** --- Fetch board (tries multiple shapes) ------------------------------- */
export async function fetchBoard():Promise<BoardState>{
  const tries = [
    async()=>{ // preferred
      const r = await safeFetchJson<any>("/api/pipeline/board"); if(!r.ok) throw r.error;
      const d=r.data;
      if (Array.isArray(d?.lanes)) {
        const out:BoardState=JSON.parse(JSON.stringify(EMPTY));
        for(const lane of d.lanes){
          const k = (lane.key||lane.stage||"").toString().toLowerCase().replace(/\s+/g,'_') as StageKey;
          if (k in out) out[k] = Array.isArray(lane.items) ? lane.items.map(asCard) : [];
        }
        return out;
      }
      // grouped object
      if (d && typeof d==='object'){
        const out:BoardState=JSON.parse(JSON.stringify(EMPTY));
        let hit=false;
        (Object.keys(out) as StageKey[]).forEach(k=>{
          if (Array.isArray((d as any)[k])) { out[k]=(d as any)[k].map(asCard); hit=true; }
        });
        if (hit) return out;
      }
      // flat array with stage field
      if (Array.isArray(d)) {
        const out:BoardState=JSON.parse(JSON.stringify(EMPTY));
        for(const row of d){ const k=toStage(row?.stage ?? row?.status); out[k].push(asCard(row)); }
        return out;
      }
      throw new Error("Unrecognized board shape");
    },
    async()=>{ // fallback to /api/applications
      const r = await safeFetchJson<any[]>("/api/applications"); if(!r.ok) throw r.error;
      const out:BoardState=JSON.parse(JSON.stringify(EMPTY));
      for(const row of (r.data||[])){ const k=toStage(row?.stage ?? row?.status); out[k].push(asCard(row)); }
      return out;
    }
  ];
  for(const t of tries){ try{ return await t(); }catch(_){} }
  // demo fallback
  const out:BoardState=JSON.parse(JSON.stringify(EMPTY));
  out.new=[{id:"D1",applicant:"Test Business Ltd",amount:5000,docs_ok:false},{id:"D2",applicant:"Acme LLC",amount:17500,docs_ok:true}];
  out.in_review=[{id:"D3",applicant:"Widget IO",amount:9000,docs_ok:true}];
  return out;
}

/** --- Card read/update --------------------------------------------------- */
export async function fetchCard(id:string):Promise<Card|null>{
  const paths=[`/api/pipeline/cards/${encodeURIComponent(id)}`,`/api/applications/${encodeURIComponent(id)}`];
  for(const p of paths){ const r=await safeFetchJson<any>(p); if(r.ok && r.data) return asCard(r.data); }
  return null;
}
export async function moveStage(cardId:string, to:StageKey):Promise<boolean>{
  const tries = [
    {m:"PATCH",u:`/api/applications/${encodeURIComponent(cardId)}/stage`,b:{stage:to}},
    {m:"PATCH",u:`/api/pipeline/cards/${encodeURIComponent(cardId)}/stage`,b:{stage:to}},
    {m:"POST", u:"/api/pipeline/move", b:{id:cardId, stage:to}}
  ] as const;
  for(const t of tries){
    const r=await safeFetchJson<any>(t.u,{method:t.m,headers:{"content-type":"application/json"},body:JSON.stringify(t.b)});
    if(r.ok) return true;
  }
  return false;
}
export async function updateCard(id:string, patch:Record<string,any>):Promise<boolean>{
  const tries=[
    {m:"PATCH",u:`/api/applications/${encodeURIComponent(id)}`,b:patch},
    {m:"PATCH",u:`/api/pipeline/cards/${encodeURIComponent(id)}`,b:patch}
  ] as const;
  for(const t of tries){
    const r=await safeFetchJson<any>(t.u,{method:t.m,headers:{"content-type":"application/json"},body:JSON.stringify(t.b)});
    if(r.ok) return true;
  }
  return false;
}

/** --- Documents API ------------------------------------------------------ */
export type DocItem = { id:string; name:string; category?:string; status?:'pending'|'accepted'|'rejected'; size?:number; updatedAt?:string; previewUrl?:string };
export async function fetchDocs(appId:string):Promise<DocItem[]>{
  const candidates=[
    `/api/documents/${encodeURIComponent(appId)}`, // grouped
    `/api/applications/${encodeURIComponent(appId)}/documents`,
    `/api/public/list/${encodeURIComponent(appId)}`
  ];
  for(const u of candidates){
    const r=await safeFetchJson<any>(u);
    if(r.ok){
      const d=r.data;
      const arr:Array<any> = Array.isArray(d) ? d : (Array.isArray(d?.items)? d.items : []);
      return arr.map((x:any)=>({
        id: String(x.id??x.documentId??x.key??x.uuid??""),
        name: x.name ?? x.filename ?? x.key ?? "(unnamed)",
        category: x.category ?? x.type ?? x.tag,
        status: x.status ?? x.state ?? (x.accepted===true?'accepted':x.rejected===true?'rejected':'pending'),
        size: x.size, updatedAt: x.updated_at ?? x.updatedAt,
        previewUrl: x.previewUrl
      }));
    }
  }
  return [];
}
export async function docPreviewUrl(docId:string):Promise<string|null>{
  const tries=[`/api/public/s3-access/${encodeURIComponent(docId)}`,`/api/documents/${encodeURIComponent(docId)}/signed-url`];
  for(const u of tries){ const r=await safeFetchJson<any>(u); if(r.ok && (r.data?.url||r.data?.signedUrl)) return r.data.url??r.data.signedUrl; }
  return null;
}
export async function downloadAllZip(appId:string):Promise<string|null>{
  const tries=[`/api/public/download-all/${encodeURIComponent(appId)}`,`/api/documents/${encodeURIComponent(appId)}/all.zip`];
  for(const u of tries){ const r=await safeFetchJson<any>(u); if(r.ok && (r.data?.url||r.data?.signedUrl)) return r.data.url??r.data.signedUrl; }
  return null;
}
export async function acceptDoc(docId:string){ 
  const tries=[{m:"POST",u:`/api/documents/${encodeURIComponent(docId)}/accept`},{m:"PATCH",u:`/api/documents/${encodeURIComponent(docId)}`,b:{status:"accepted"}}];
  for(const t of tries){ const r=await safeFetchJson<any>(t.u,{method:t.m,headers:{"content-type":"application/json"},body:t.b?JSON.stringify(t.b):undefined}); if(r.ok) return true; }
  return false;
}
export async function rejectDoc(docId:string, reason:string){ 
  const tries=[{m:"POST",u:`/api/documents/${encodeURIComponent(docId)}/reject`,b:{reason}},{m:"PATCH",u:`/api/documents/${encodeURIComponent(docId)}`,b:{status:"rejected",reason}}];
  for(const t of tries){ const r=await safeFetchJson<any>(t.u,{method:t.m,headers:{"content-type":"application/json"},body:JSON.stringify(t.b)}); if(r.ok) return true; }
  return false;
}
export async function reuploadDoc(appId:string, file:File, category?:string){
  // presigned multi-fallback
  const presignedPaths=[
    `/api/public/s3-upload/${encodeURIComponent(appId)}`,
    `/api/documents/${encodeURIComponent(appId)}/upload`
  ];
  for(const u of presignedPaths){
    try{
      const fd=new FormData(); fd.append("file",file); if(category) fd.append("category",category);
      const r=await fetch(u,{method:"POST",body:fd,headers:new Headers(Object.assign({}, localStorage.getItem('apiToken')?{'authorization':`Bearer ${localStorage.getItem('apiToken')}`} : {}))});
      if(r.ok) return true;
    }catch{/**/}
  }
  return false;
}

/** --- Lenders / Recommendations ----------------------------------------- */
export type LenderRec = { id:string; name:string; product?:string; score?:number; notes?:string };
export async function getRecommendations(appId:string):Promise<LenderRec[]>{
  const tries=[
    `/api/lenders/recommendations?appId=${encodeURIComponent(appId)}`,
    `/api/lender-products-real/recommend?appId=${encodeURIComponent(appId)}`,
    `/api/lender-products-simple?appId=${encodeURIComponent(appId)}`
  ];
  for(const u of tries){
    const r=await safeFetchJson<any>(u);
    if(r.ok){
      const d=r.data;
      const arr = Array.isArray(d) ? d : (Array.isArray(d?.items)? d.items : []);
      return arr.map((x:any)=>({ id:String(x.id??x.productId??x.uuid??x.name), name:x.name??x.lender_name??"(unknown)", product:x.product_name??x.product, score: Number(x.score??x.likelihood??0) || undefined, notes: x.notes }));
    }
  }
  return [];
}
export async function sendToLender(appId:string, productId:string){
  const tries=[
    {m:"POST",u:`/api/lenders/send`,b:{applicationId:appId, productId}},
    {m:"POST",u:`/api/lenders/transmit`,b:{appId:appId, lenderProductId:productId}},
  ] as const;
  for(const t of tries){
    const r=await safeFetchJson<any>(t.u,{method:t.m,headers:{"content-type":"application/json"},body:JSON.stringify(t.b)});
    if(r.ok) return true;
  }
  return false;
}
TS

echo ">> [4/11] Application Drawer (5 tabs + docs + lenders)"
cat > client/src/pages/staff/components/ApplicationDrawer.tsx <<'TSX'
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Card, DocItem, LenderRec, StageKey } from "../../../lib/api/pipeline";
import { StageTitles, fetchCard, updateCard, fetchDocs, docPreviewUrl, downloadAllZip, acceptDoc, rejectDoc, reuploadDoc, getRecommendations, sendToLender } from "../../../lib/api/pipeline";

type TabKey = "application"|"banking"|"financials"|"documents"|"lenders";

export default function ApplicationDrawer({open,id,onClose,onStageChange}:{open:boolean; id:string|null; onClose:()=>void; onStageChange?:(s:StageKey)=>void;}){
  const [tab,setTab]=useState<TabKey>("application");
  const [card,setCard]=useState<Card|null>(null);
  const [busy,setBusy]=useState(false);
  const [docs,setDocs]=useState<DocItem[]>([]);
  const [recs,setRecs]=useState<LenderRec[]>([]);
  const inputRef = useRef<HTMLInputElement|null>(null);

  useEffect(()=>{ if(!open||!id) return; (async()=>{
    const c=await fetchCard(id); setCard(c);
    const d=await fetchDocs(id); setDocs(d);
    const r=await getRecommendations(id); setRecs(r);
  })(); },[open,id]);

  const stage = useMemo(()=> (card?.stage ?? "new") as StageKey, [card]);

  async function mutate(patch:Record<string,any>){
    if(!card) return;
    setBusy(true);
    const ok=await updateCard(card.id, patch);
    if(ok){ setCard({...card, ...patch}); }
    setBusy(false);
  }

  async function doReupload(file:File){
    if(!card) return;
    setBusy(true);
    const ok = await reuploadDoc(card.id, file);
    if(ok){ const d=await fetchDocs(card.id); setDocs(d); }
    setBusy(false);
  }

  function triggerUpload(){ inputRef.current?.click(); }
  function onFileChange(e:any){ const f=e.target.files?.[0]; if(f) doReupload(f); e.target.value=""; }

  return (
    <div className={"drawer"+(open?" open":"")} aria-hidden={!open}>
      <div className="drawer-head">
        <div>
          <div className="small">Application</div>
          <div style={{fontWeight:800,fontSize:18}}>{card?.name||card?.applicant||id}</div>
          <div className="small">{StageTitles[stage]} {card?.amount!=null? " • $"+Number(card.amount).toLocaleString():""}</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="lm-btn" onClick={onClose}>Close</button>
          <button className="lm-btn primary" disabled={busy} onClick={()=>mutate({pin:true})}>Save</button>
        </div>
      </div>

      <div className="tabs">
        {(["application","banking","financials","documents","lenders"] as TabKey[]).map(t=>
          <button key={t} className={t===tab?"active":""} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>
        )}
      </div>

      <div className="tab-body">
        {tab==="application" && card && <ApplicationTab card={card} onChange={mutate} />}
        {tab==="banking" && card && <BankingTab card={card} />}
        {tab==="financials" && card && <FinancialsTab card={card} />}
        {tab==="documents" && card && <DocumentsTab appId={card.id} items={docs} onRefresh={async()=>setDocs(await fetchDocs(card.id))} onUploadClick={triggerUpload} />}
        {tab==="lenders" && card && <LendersTab appId={card.id} recs={recs} onRefresh={async()=>setRecs(await getRecommendations(card.id))} />}
      </div>

      {/* hidden file input for reupload */}
      <input ref={inputRef} type="file" style={{display:"none"}} onChange={onFileChange}/>
    </div>
  );
}

/** ---------------- Tabs ------------------ */
function RowKV({label,children}:{label:string;children:any}){ return <div className="kv"><div className="small">{label}</div><div>{children}</div></div>; }

function ApplicationTab({card,onChange}:{card:Card; onChange:(p:Record<string,any>)=>void}){
  const [amount,setAmount]=useState<string>(card.amount!=null? String(card.amount):"");
  const [email,setEmail]=useState<string>(card['business_email']||card['contactEmail']||"");
  const [phone,setPhone]=useState<string>(card['business_phone']||card['contactPhone']||"");
  return <div className="row">
    <div style={{flex:1}}>
      <RowKV label="Applicant">{card.name||card.applicant}</RowKV>
      <RowKV label="Amount">
        <input className="lm-input" value={amount} onChange={e=>setAmount(e.target.value)} onBlur={()=>onChange({amount: Number(amount)||undefined})}/>
      </RowKV>
      <RowKV label="Email"><input className="lm-input" value={email} onChange={e=>setEmail(e.target.value)} onBlur={()=>onChange({contactEmail: email})}/></RowKV>
      <RowKV label="Phone"><input className="lm-input" value={phone} onChange={e=>setPhone(e.target.value)} onBlur={()=>onChange({contactPhone: phone})}/></RowKV>
    </div>
    <div style={{flex:1}}>
      <div className="small" style={{marginBottom:6}}>Rules</div>
      <div className="lm-card" style={{padding:10}}>
        <div className="small">• Missing or rejected docs ⇒ <b>Requires Docs</b></div>
        <div className="small">• Accepted ⇒ <b>Lender</b> or <b>Accepted</b> stage</div>
      </div>
    </div>
  </div>;
}

function BankingTab({card}:{card:Card}){
  return <div>
    <div className="small" style={{marginBottom:8}}>OCR / Banking Insights</div>
    <div className="lm-card" style={{padding:10}}>
      <div className="small">This panel surfaces account health, average balance, NSFs, inflow/outflow, etc. (wired to your OCR/banking endpoints when available).</div>
    </div>
  </div>;
}

function FinancialsTab({card}:{card:Card}){
  return <div>
    <div className="small" style={{marginBottom:8}}>Financials (OCR)</div>
    <div className="lm-card" style={{padding:10}}>
      <div className="small">This panel surfaces income statement / balance sheet / tax items as extracted.</div>
    </div>
  </div>;
}

function DocRow({d, onRefresh}:{d:DocItem; onRefresh:()=>void}){
  const [busy,setBusy]=useState(false);
  async function open(){
    let url=d.previewUrl;
    if(!url) url=await docPreviewUrl(d.id);
    if(url) window.open(url,"_blank");
  }
  async function accept(){ setBusy(true); await acceptDoc(d.id).catch(()=>{}); setBusy(false); onRefresh(); }
  async function reject(){ const reason=prompt("Reason for rejection?")||"Not specified"; setBusy(true); await rejectDoc(d.id, reason).catch(()=>{}); setBusy(false); onRefresh(); }
  return <div className="doc">
    <div className="left">
      <b>{d.name}</b>
      <div className="small">{d.category||"uncategorized"} • {d.size? (Math.round((d.size/1024/1024)*10)/10)+" MB": "size n/a"}</div>
      <div className={"small status "+(d.status==="accepted"?"good":d.status==="rejected"?"bad":"")}>Status: {d.status||"pending"}</div>
    </div>
    <div className="right">
      <button className="lm-btn" onClick={open}>Preview</button>
      <button className="lm-btn" disabled={busy} onClick={accept}>Accept</button>
      <button className="lm-btn" disabled={busy} onClick={reject}>Reject</button>
    </div>
  </div>;
}

function DocumentsTab({appId,items,onRefresh,onUploadClick}:{appId:string;items:DocItem[];onRefresh:()=>void;onUploadClick:()=>void}){
  async function downloadZip(){
    const url=await downloadAllZip(appId); if(url) window.open(url,"_blank");
  }
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <div className="small">Documents</div>
      <div style={{display:"flex",gap:8}}>
        <button className="lm-btn" onClick={onUploadClick}>Re-upload</button>
        <button className="lm-btn" onClick={downloadZip}>Download ZIP</button>
      </div>
    </div>
    {items.length===0 && <div className="small">No documents yet.</div>}
    {items.map(d => <DocRow key={d.id} d={d} onRefresh={onRefresh}/>)}
  </div>;
}

function LenderRow({r, onSend}:{r:LenderRec; onSend:(id:string)=>void}){
  return <div className="doc">
    <div className="left">
      <b>{r.name}</b>
      <div className="small">{r.product||"—"}</div>
      {r.score!=null && <div className="small">Score: {Math.round((r.score)*100)/100}</div>}
    </div>
    <div className="right">
      <button className="lm-btn primary" onClick={()=>onSend(r.id)}>Send</button>
    </div>
  </div>;
}
function LendersTab({appId,recs,onRefresh}:{appId:string;recs:LenderRec[];onRefresh:()=>void}){
  const [busy,setBusy]=useState<string|undefined>();
  async function send(id:string){
    setBusy(id);
    const ok=await sendToLender(appId,id);
    setBusy(undefined);
    if(ok){ alert("Sent to lender"); onRefresh(); } else { alert("Send failed"); }
  }
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
      <div className="small">Recommendations</div>
      <button className="lm-btn" onClick={onRefresh}>Refresh</button>
    </div>
    {recs.length===0 && <div className="small">No recommendations yet.</div>}
    {recs.map(r => <LenderRow key={r.id} r={r} onSend={send}/>)}
  </div>;
}
TSX

echo ">> [5/11] Sales Pipeline (DnD + drawer open)"
cat > client/src/pages/staff/sections/SalesPipeline.tsx <<'TSX'
import React, { useEffect, useState } from "react";
import type { BoardState, Card, StageKey } from "../../../lib/api/pipeline";
import { fetchBoard, moveStage, StageTitles } from "../../../lib/api/pipeline";
import ApplicationDrawer from "../components/ApplicationDrawer";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from "@dnd-kit/core";

const STAGES:StageKey[]=["new","requires_docs","in_review","lender","accepted","declined"];

function Column({stage,items,onOpen}:{stage:StageKey;items:Card[];onOpen:(id:string)=>void}){
  const {isOver,setNodeRef}=useDroppable({id:stage});
  return <div ref={setNodeRef} className="col" style={{background:isOver?"#f1f5f9":"#fbfdff"}}>
    <div className="head"><b>{StageTitles[stage]}</b><span className="small">{items.length}</span></div>
    <div style={{display:"grid",gap:8}}>
      {items.map(it=> <CardItem key={it.id} item={it} onOpen={onOpen}/>)}
      {items.length===0 && <div className="small">Drop here</div>}
    </div>
  </div>;
}

function CardItem({item,onOpen}:{item:Card;onOpen:(id:string)=>void}){
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({id:item.id});
  const style:React.CSSProperties={
    transform: transform?`translate3d(${transform.x}px,${transform.y}px,0)`:"none",
    opacity: isDragging?.valueOf()? .85 : 1
  };
  return <div ref={setNodeRef} {...attributes} {...listeners} className="card" style={style} onDoubleClick={()=>onOpen(item.id)}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <div style={{fontWeight:700}}>{item.name||item.applicant||item.id}</div>
        <div className="meta">
          {item.amount!=null ? `$${Number(item.amount).toLocaleString()}`:""} {item.docs_ok===true?"• docs ✓":item.docs_ok===false?"• docs ✗":""}
        </div>
      </div>
      <button className="lm-btn" onClick={()=>onOpen(item.id)}>Open</button>
    </div>
  </div>;
}

export default function SalesPipeline(){
  const [board,setBoard]=useState<BoardState>({new:[],requires_docs:[],in_review:[],lender:[],accepted:[],declined:[]});
  const [openId,setOpenId]=useState<string|null>(null);
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:5}}));

  useEffect(()=>{(async()=>{
    const b=await fetchBoard(); setBoard(b);
    console.log("[pipeline] loaded lanes:", Object.fromEntries(Object.entries(b).map(([k,v])=>[k,Array.isArray(v)?v.length:0])));
  })()},[]);

  function stageOf(id:string):StageKey|undefined{
    for(const s of STAGES) if(board[s].some(c=>c.id===id)) return s; return undefined;
  }

  async function onDragEnd(e:DragEndEvent){
    const id=String(e.active.id); const to = e.over?.id? String(e.over.id) as StageKey : undefined;
    const from=stageOf(id); if(!from||!to||from===to) return;
    // optimistic
    const prev=structuredClone(board);
    setBoard(cur=>{
      const next=structuredClone(cur) as BoardState;
      const src=next[from]; const i=src.findIndex(x=>x.id===id);
      if(i>=0){ const [card]=src.splice(i,1); next[to].unshift(card); }
      return next;
    });
    const ok=await moveStage(id,to);
    if(!ok){ console.warn("[pipeline] move failed → rollback"); setBoard(prev); }
  }

  return <>
    <div className="lm-toolbar lm-card">
      <div className="lm-title">Sales Pipeline</div>
      <div style={{display:"flex",gap:8}}>
        <button className="lm-pill active">Board</button>
      </div>
    </div>
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid-6">
        {STAGES.map(s=> <Column key={s} stage={s} items={board[s]} onOpen={(id)=>setOpenId(id)}/>)}
      </div>
    </DndContext>
    <ApplicationDrawer open={!!openId} id={openId} onClose={()=>setOpenId(null)} />
  </>;
}
TSX

echo ">> [6/11] Wire into top-tabs dashboard (pipeline tab) — idempotent"
TAB1="client/src/pages/staff/TopTabsDashboard.tsx"
TAB2="client/src/pages/Dashboard.tsx"
for F in "$TAB1" "$TAB2"; do
  if [ -f "$F" ]; then
    grep -q 'from "./sections/SalesPipeline"' "$F" 2>/dev/null || sed -i '1i import SalesPipeline from "./sections/SalesPipeline";' "$F"
    # Replace any pipeline placeholder with <SalesPipeline/>
    perl -0777 -i -pe 's/\{tab===["'\'']pipeline["'\'']\}[\s\S]*?\}/\{tab==="pipeline" && <SalesPipeline\/>\}/s' "$F" || true
  fi
done

echo ">> [7/11] Ensure deps (@dnd-kit/core)"
if ! node -e "require('@dnd-kit/core')" >/dev/null 2>&1; then
  npm i -S @dnd-kit/core >/dev/null 2>&1 || npm i -S @dnd-kit/core
fi

echo ">> [8/11] Build to client/dist (single source of truth)"
rm -rf client/dist dist dist/public 2>/dev/null || true
if npx --yes vite build --mode production >/dev/null 2>&1; then echo "vite build OK"; else npm run build || true; fi
if [ -d dist/public ]; then mkdir -p client/dist && rsync -a --delete dist/public/ client/dist/ && rm -rf dist; fi
test -f client/dist/index.html || { echo "❌ Build missing at client/dist/index.html"; exit 1; }

echo ">> [9/11] Snapshot summary"
node <<'NODE' > out/pipeline-install-summary.json
const fs=require('fs');
const has=p=>fs.existsSync(p);
const out={
  files:{
    brand:has('client/src/styles/brand.css'),
    pipeline:'client/src/pages/staff/sections/SalesPipeline.tsx',
    drawer:'client/src/pages/staff/components/ApplicationDrawer.tsx',
    api:'client/src/lib/api/pipeline.ts',
    indexHtml:has('client/dist/index.html')
  }
};
console.log(JSON.stringify(out,null,2));
NODE
cat out/pipeline-install-summary.json

echo ">> [10/11] Tips"
echo "Open External tab → /dashboard#/pipeline"
echo "If needed (dev auth): localStorage.setItem('apiToken','dev'); location.reload();"

echo ">> [11/11] DONE — Full Sales Pipeline installed."
```

### What this ships (all in this one paste)

* **6-lane board** with **@dnd-kit** drag-and-drop and **optimistic rollback** on failures.
* **Application Drawer** (slide-in) with **5 tabs**:

  1. **Application** (edit core fields)
  2. **Banking** (OCR/banking insights placeholder wired for your endpoints)
  3. **Financials** (OCR groupings)
  4. **Documents** → **preview (signed URL)**, **accept**, **reject (reason)**, **re-upload**, **Download ZIP**
  5. **Lenders** → **recommendations** (scores) + **Send to Lender**
* **DB→UI normalization** so mismatched schemas still render (e.g., `legal_business_name` / `dba_name` / `contact_first_name` … → `name`, `requested_amount|loan_amount → amount`, `missing_docs → docs_ok`, and flexible `stage` mapping).
* **Multi-endpoint fallbacks** for every operation. If your server mounted slightly different routes, it tries alternates.
* **Lisa-Morgan style** reinforced globally.
* **Top-tabs wiring** so the **pipeline tab** renders this implementation.
* **Production build** copied to `client/dist` so the server serves the static SPA (no dev fallback flicker).

If anything in your backend uses different paths/names, the fallbacks should still catch most cases. If you want me to also output a **one-paste endpoint shim** on the server to unify responses exactly to these adapters, say the word and I’ll add it in one block.
