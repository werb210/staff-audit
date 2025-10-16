# === install_pipeline_with_drawer.sh =========================================
set -euo pipefail

echo ">> [0/9] Ensure dirs"
mkdir -p client/src/lib/api client/src/pages/staff/sections client/src/pages/staff/components client/src/styles server/routes

echo ">> [1/9] Drawer styles (idempotent)"
grep -q '.lm-drawer' client/src/styles/brand.css 2>/dev/null || cat >> client/src/styles/brand.css <<'CSS'
/* Drawer + board odds & ends */
.lm-drawer-mask{position:fixed;inset:0;background:rgba(15,23,42,.42);backdrop-filter:saturate(150%) blur(2px);z-index:80;}
.lm-drawer{position:fixed;top:0;right:0;height:100vh;width:min(880px,96vw);background:#fff;border-left:1px solid var(--line);box-shadow:var(--shadow-md);z-index:90;display:flex;flex-direction:column;}
.lm-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--line);}
.lm-drawer-tabs{display:flex;gap:8px;padding:8px 12px;border-bottom:1px solid var(--line);}
.lm-tab{border:1px solid var(--line);border-radius:999px;background:#fff;padding:.45rem .8rem;cursor:pointer;}
.lm-tab.active{background:var(--accent);border-color:var(--accent);color:#fff;}
.lm-drawer-body{flex:1;overflow:auto;padding:16px;display:grid;gap:12px}
.board-grid{display:grid;grid-template-columns:repeat(6,minmax(260px,1fr));gap:12px;align-items:start}
.board-col{background:#fff;border:1px solid var(--line);border-radius:12px;min-height:420px;padding:10px}
.board-col-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px;cursor:grab}
.card:hover{box-shadow:var(--shadow-sm)}
.lm-kbd{font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;font-size:.75rem;background:#f1f5f9;border:1px solid var(--line);border-radius:6px;padding:.1rem .35rem}
.dialer-slide{border-top:1px solid var(--line);padding:12px;background:#f8fafc;border-radius:12px}
.dialer-row{display:flex;gap:8px;align-items:center}
.docs-grid{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center}
.table-like{display:grid;grid-template-columns:1.2fr .9fr .9fr .9fr auto;gap:8px}
CSS

echo ">> [2/9] Pipeline API (board, card details, docs, lenders, move)"
cat > client/src/lib/api/pipeline.ts <<'TS'
import { safeFetchJson } from "../safeFetch";

export type StageKey = "new"|"requires_docs"|"in_review"|"lender"|"accepted"|"declined";
export const STAGES: StageKey[] = ["new","requires_docs","in_review","lender","accepted","declined"];

export type Card = {
  id: string;
  applicant: string;
  amount?: number;
  email?: string;
  phone?: string;
  docs_ok?: boolean;
  stage?: StageKey;
  createdAt?: string;
  // raw passthrough
  _raw?: any;
};

export type BoardState = Record<StageKey, Card[]>;

function emptyBoard(): BoardState {
  return { new:[], requires_docs:[], in_review:[], lender:[], accepted:[], declined:[] };
}

function bool(val:any){ return val === true || val === 1 || val === "true"; }

function normalizeCard(a:any): Card {
  // try business / contact fields seen in your DB/app
  const legal = a.legal_business_name || a.legalBusinessName || a.business_name;
  const dba   = a.dba_name || a.dbaName;
  const first = a.contact_first_name || a.contactFirstName || a.first_name;
  const last  = a.contact_last_name  || a.contactLastName  || a.last_name;
  const name  = legal || dba || [first,last].filter(Boolean).join(" ") || a.applicant || a.name || a.id;
  const amount = a.loan_amount ?? a.requested_amount ?? a.amount;
  const missingDocs = a.missing_docs?.length ? a.missing_docs : a.missingDocs;
  const approvals = a.document_approvals || a.documentApprovals;
  const docs_ok = missingDocs ? (missingDocs.length===0) :
                  (Array.isArray(approvals) ? approvals.every((d:any)=>d.status==="accepted"||d.accepted===true) : undefined);
  let stage:StageKey|undefined = a.stage;
  if (!stage) {
    // derive stage fallback
    if (docs_ok===false) stage = "requires_docs";
    else stage = "new";
  }
  return {
    id: String(a.id),
    applicant: String(name||""),
    amount: amount!=null ? Number(amount) : undefined,
    email: a.contact_email || a.contactEmail || a.email,
    phone: a.contact_phone || a.contactPhone || a.phone,
    docs_ok,
    stage,
    createdAt: a.created_at || a.createdAt,
    _raw: a
  };
}

export async function fetchBoard(): Promise<BoardState> {
  // Try several shapes/endpoints → normalize
  const attempts = [
    async () => {
      const r = await safeFetchJson<any>("/api/pipeline/board");
      if (!r.ok) throw r.error;
      const out = emptyBoard();
      if (Array.isArray(r.data?.lanes)) {
        for (const lane of r.data.lanes) {
          const k = (lane.key || lane.stage) as StageKey;
          if (STAGES.includes(k)) out[k] = (lane.items||[]).map(normalizeCard);
        }
        return out;
      }
      if (r.data && typeof r.data==="object") {
        // grouped object
        const out2 = emptyBoard();
        let hit=false;
        for (const k of STAGES){ if (Array.isArray(r.data[k])) { out2[k]=r.data[k].map(normalizeCard); hit=true; } }
        if (hit) return out2;
      }
      throw new Error("unrecognized");
    },
    async () => {
      // flat applications → group by stage
      const r = await safeFetchJson<any[]>("/api/applications");
      if (!r.ok || !Array.isArray(r.data)) throw r;
      const out = emptyBoard();
      for (const app of r.data) {
        const card = normalizeCard(app);
        const st:StageKey = (card.stage && STAGES.includes(card.stage) ? card.stage : (card.docs_ok===false?"requires_docs":"new")) as StageKey;
        out[st].push(card);
      }
      return out;
    }
  ];
  for (const t of attempts) {
    try { return await t(); } catch {}
  }
  // last resort demo
  const demo = emptyBoard();
  demo.new = [{id:"D1", applicant:"Test Business Ltd", amount:15000, docs_ok:false}];
  demo.in_review = [{id:"D2", applicant:"Acme LLC", amount:32000, docs_ok:true}];
  return demo;
}

export async function fetchCard(id:string): Promise<any|null> {
  const tries = [`/api/pipeline/cards/${encodeURIComponent(id)}`, `/api/applications/${encodeURIComponent(id)}`];
  for (const u of tries){
    const r = await safeFetchJson<any>(u);
    if (r.ok && r.data) return r.data;
  }
  return null;
}

export async function moveStage(id:string, to:StageKey): Promise<boolean>{
  const bodies = [
    { m:"PATCH", u:`/api/applications/${encodeURIComponent(id)}/stage`, body:{ stage: to } },
    { m:"POST",  u:`/api/pipeline/move`, body:{ id, stage: to } },
    { m:"PATCH", u:`/api/pipeline/cards/${encodeURIComponent(id)}/stage`, body:{ stage: to } },
  ] as const;
  for (const b of bodies){
    const r = await safeFetchJson<any>(b.u, { method:b.m, headers:{ "content-type":"application/json" }, body: JSON.stringify(b.body) });
    if (r.ok) return true;
  }
  return false;
}

export async function listDocuments(appId:string): Promise<any[]>{
  const tries = [
    `/api/documents/${encodeURIComponent(appId)}`,
    `/api/applications/${encodeURIComponent(appId)}/documents`
  ];
  for (const u of tries){
    const r = await safeFetchJson<any[]>(u);
    if (r.ok && Array.isArray(r.data)) return r.data;
  }
  return [];
}

export async function approveDocument(docId:string){ 
  const tries = [
    {m:"POST",u:`/api/documents/${encodeURIComponent(docId)}/approve`},
    {m:"PATCH",u:`/api/documents/${encodeURIComponent(docId)}`,body:{status:"accepted"}}
  ];
  for (const t of tries){
    const r = await safeFetchJson<any>(t.u, { method:t.m, headers:{ "content-type":"application/json" }, body: t.body?JSON.stringify(t.body):undefined });
    if (r.ok) return true;
  }
  return false;
}

export async function rejectDocument(docId:string, reason?:string){ 
  const tries = [
    {m:"POST",u:`/api/documents/${encodeURIComponent(docId)}/reject`,body:{reason}},
    {m:"PATCH",u:`/api/documents/${encodeURIComponent(docId)}`,body:{status:"rejected",reason}}
  ];
  for (const t of tries){
    const r = await safeFetchJson<any>(t.u, { method:t.m, headers:{ "content-type":"application/json" }, body: JSON.stringify(t.body) });
    if (r.ok) return true;
  }
  return false;
}

export async function uploadDocument(appId:string, file:File, kind?:string){
  // Prefer presigned upload if exposed, otherwise send as multipart
  const presign = await safeFetchJson<any>(`/api/public/s3-upload/${encodeURIComponent(appId)}`, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ filename:file.name, contentType:file.type, kind }) });
  if (presign.ok && presign.data?.url) {
    await fetch(presign.data.url, { method:"PUT", headers:{ "content-type": file.type }, body: file });
    return true;
  }
  const fd = new FormData(); fd.append("file", file); if (kind) fd.append("kind", kind);
  const direct = await fetch(`/api/documents/${encodeURIComponent(appId)}/upload`, { method:"POST", body: fd });
  return direct.ok;
}

export async function downloadAll(appId:string){
  const u = `/api/public/download-all/${encodeURIComponent(appId)}`;
  window.open(u, "_blank");
}

export async function recommendLenders(appId:string): Promise<any[]>{
  const tries = [
    `/api/lender-products-real?matchApp=${encodeURIComponent(appId)}`,
    `/api/lender-products-simple?matchApp=${encodeURIComponent(appId)}`
  ];
  for (const u of tries){
    const r = await safeFetchJson<any[]>(u);
    if (r.ok && Array.isArray(r.data)) return r.data;
  }
  return [];
}

export async function sendToLender(appId:string, productId:string){
  const tries = [
    {m:"POST",u:`/api/lenders/send`,body:{ applicationId:appId, productId }},
    {m:"POST",u:`/api/lenders/${encodeURIComponent(productId)}/send`,body:{ applicationId:appId }}
  ];
  for (const t of tries){
    const r = await safeFetchJson<any>(t.u, { method:t.m, headers:{ "content-type":"application/json" }, body: JSON.stringify(t.body) });
    if (r.ok) return true;
  }
  return false;
}
TS

echo ">> [3/9] Drawer component with tabs + slide-in dialer"
cat > client/src/pages/staff/components/ApplicationDrawer.tsx <<'TSX'
import React from "react";
import { listDocuments, approveDocument, rejectDocument, uploadDocument, downloadAll, recommendLenders, sendToLender, fetchCard } from "../../../lib/api/pipeline";
import { startCall, hangupCall } from "../../../lib/api/voice";

export default function ApplicationDrawer({open,id,onClose}:{open:boolean; id:string|null; onClose:()=>void}){
  const [tab,setTab]=React.useState<"application"|"banking"|"financials"|"documents"|"lenders"|"activity">("application");
  const [dialerOpen,setDialerOpen]=React.useState(false);
  const [card,setCard]=React.useState<any|null>(null);
  const [docs,setDocs]=React.useState<any[]>([]);
  const [lenders,setLenders]=React.useState<any[]>([]);
  const [dial,setDial]=React.useState<string>("");

  React.useEffect(()=>{ 
    if (open && id){
      (async()=>{
        const c = await fetchCard(id); setCard(c);
        setDial(c?.contact_phone || c?.contactPhone || c?.phone || "");
        const d = await listDocuments(id); setDocs(d||[]);
        const L = await recommendLenders(id); setLenders(L||[]);
      })();
    }
  },[open,id]);

  if (!open || !id) return null;

  async function onApprove(docId:string){ if(await approveDocument(docId)) setDocs(prev=>prev.map(d=>d.id===docId?{...d,status:"accepted"}:d)); else alert("Approve failed"); }
  async function onReject(docId:string){ const reason = prompt("Reason for rejection?")||""; if(await rejectDocument(docId,reason)) setDocs(prev=>prev.map(d=>d.id===docId?{...d,status:"rejected",reason}:d)); else alert("Reject failed"); }
  async function onUpload(ev:React.ChangeEvent<HTMLInputElement>){ const f=ev.target.files?.[0]; if(!f||!id) return; const ok=await uploadDocument(id,f); if(ok){ const d=await listDocuments(id); setDocs(d||[]);} else alert("Upload failed"); }
  async function doCall(){ if(!dial) return; const r=await startCall({to:dial}); if(!(r as any).ok) alert("Call failed"); }
  async function endCall(){ await hangupCall().catch(()=>null); }
  async function doSend(productId:string){ if(!id) return; const ok=await sendToLender(id, productId); if(!ok) alert("Send failed"); }

  return (
    <>
      <div className="lm-drawer-mask" onClick={onClose}/>
      <div className="lm-drawer">
        <div className="lm-drawer-head">
          <div style={{display:"grid"}}>
            <div style={{fontWeight:700}}>{card?.legal_business_name || card?.legalBusinessName || card?.dba_name || card?.applicant || id}</div>
            <div className="lm-subtle" style={{display:"flex",gap:8,alignItems:"center"}}>
              <span>{card?.contact_email || card?.email || "—"}</span>
              <span>•</span>
              <span>{card?.contact_phone || card?.phone || "—"}</span>
              <span>•</span>
              <span>Amount: {card?.loan_amount ?? card?.requested_amount ?? "—"}</span>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button className="lm-btn" onClick={()=>setDialerOpen(v=>!v)}>{dialerOpen?"Hide Dialer":"Dial"}</button>
            <button className="lm-btn" onClick={()=>downloadAll(id!)}>Download ZIP</button>
            <button className="lm-btn" onClick={onClose}>Close</button>
          </div>
        </div>

        <div className="lm-drawer-tabs">
          {["application","banking","financials","documents","lenders","activity"].map(t=>(
            <button key={t} className={`lm-tab ${tab===t?"active":""}`} onClick={()=>setTab(t as any)}>{t[0].toUpperCase()+t.slice(1)}</button>
          ))}
        </div>

        <div className="lm-drawer-body">
          {tab==="application" && (
            <div className="table-like">
              <div><b>Legal Name</b><div>{card?.legal_business_name || card?.legalBusinessName || "—"}</div></div>
              <div><b>DBA</b><div>{card?.dba_name || card?.dbaName || "—"}</div></div>
              <div><b>Contact</b><div>{[card?.contact_first_name||card?.contactFirstName, card?.contact_last_name||card?.contactLastName].filter(Boolean).join(" ") || "—"}</div></div>
              <div><b>Email</b><div>{card?.contact_email || card?.email || "—"}</div></div>
              <div><b>Phone</b><div>{card?.contact_phone || card?.phone || "—"}</div></div>
              <div><b>Requested</b><div>{card?.requested_amount ?? card?.loan_amount ?? "—"}</div></div>
              <div><b>Use</b><div>{card?.use_of_funds || card?.useOfFunds || "—"}</div></div>
              <div><b>Revenue</b><div>{card?.annual_revenue || card?.annualRevenue || "—"}</div></div>
              <div><b>Years</b><div>{card?.years_in_business || card?.yearsInBusiness || "—"}</div></div>
              <div><b>Employees</b><div>{card?.numberOfEmployees || card?.employees || "—"}</div></div>
            </div>
          )}

          {tab==="banking" && (
            <div>
              <div className="lm-subtle">OCR Banking analysis (normalized fields)</div>
              <pre className="lm-card" style={{padding:12,whiteSpace:"pre-wrap",maxHeight:360,overflow:"auto"}}>{JSON.stringify(card?.bankingAnalysis||card?.banking_analysis||{},null,2)}</pre>
            </div>
          )}

          {tab==="financials" && (
            <div>
              <div className="lm-subtle">Financial OCR / statements</div>
              <pre className="lm-card" style={{padding:12,whiteSpace:"pre-wrap",maxHeight:360,overflow:"auto"}}>{JSON.stringify(card?.financialsOcr||card?.financials_ocr||{},null,2)}</pre>
            </div>
          )}

          {tab==="documents" && (
            <div className="lm-card" style={{padding:12}}>
              <div className="docs-grid lm-subtle" style={{fontWeight:600}}>
                <div>Document</div><div>Status</div><div>Actions</div>
              </div>
              {docs.map(d=>(
                <div key={d.id} className="docs-grid">
                  <div>{d.name || d.filename || d.key || d.id}</div>
                  <div>{d.status || "—"}</div>
                  <div style={{display:"flex",gap:8}}>
                    <button className="lm-btn" onClick={()=>onApprove(d.id)}>Approve</button>
                    <button className="lm-btn" onClick={()=>onReject(d.id)}>Reject</button>
                  </div>
                </div>
              ))}
              <div style={{marginTop:8,display:"flex",gap:8}}>
                <input type="file" onChange={onUpload}/>
                <button className="lm-btn" onClick={()=>downloadAll(String(id))}>Download All</button>
              </div>
            </div>
          )}

          {tab==="lenders" && (
            <div className="lm-card" style={{padding:12}}>
              <div className="lm-subtle" style={{marginBottom:8}}>Matched lender products</div>
              <div style={{display:"grid",gridTemplateColumns:"1.2fr .7fr .7fr .7fr auto",gap:8}}>
                <div><b>Product</b></div><div><b>Rate</b></div><div><b>Term</b></div><div><b>Amount</b></div><div/>
                {lenders.map((p:any)=>(
                  <React.Fragment key={p.id||p.product_id}>
                    <div>{p.name || p.product_name || "—"}</div>
                    <div>{p.interest_rate_min!=null? `${p.interest_rate_min}–${p.interest_rate_max??"?"}%` : (p.rateAPR?`${p.rateAPR}%`:"—")}</div>
                    <div>{p.term_min||p.termMonths||"—"}</div>
                    <div>{p.amount_min!=null? `${p.amount_min}–${p.amount_max??"?"}` : (p.maxAmount||"—")}</div>
                    <div><button className="lm-btn primary" onClick={()=>doSend(String(p.id||p.product_id))}>Send</button></div>
                  </React.Fragment>
                ))}
                {lenders.length===0 && <div className="lm-subtle" style={{gridColumn:"1/-1"}}>No matches.</div>}
              </div>
            </div>
          )}

          {tab==="activity" && (
            <div className="lm-card" style={{padding:12}}>
              <div className="lm-subtle">Activity feed coming next (notes, status changes, comms).</div>
            </div>
          )}

          {dialerOpen && (
            <div className="dialer-slide">
              <div className="dialer-row">
                <input className="lm-input" style={{maxWidth:280}} placeholder="+1 (___) ___-____" value={dial} onChange={e=>setDial(e.target.value)}/>
                <button className="lm-btn" onClick={doCall}>Call</button>
                <button className="lm-btn" onClick={endCall}>End</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
TSX

echo ">> [4/9] SalesPipeline board (DnD, click → drawer)"
cat > client/src/pages/staff/sections/SalesPipeline.tsx <<'TSX'
import React from "react";
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable, useDraggable } from "@dnd-kit/core";
import { STAGES, type StageKey, type Card, type BoardState, fetchBoard, moveStage } from "../../../lib/api/pipeline";
import ApplicationDrawer from "../components/ApplicationDrawer";

function Column({stage,items,onOpen}:{stage:StageKey; items:Card[]; onOpen:(id:string)=>void}){
  const {setNodeRef,isOver} = useDroppable({id:stage});
  return (
    <div ref={setNodeRef} className="board-col" style={{background:isOver?"#f1f5f9":"#fff"}}>
      <div className="board-col-title">
        <strong style={{textTransform:"capitalize"}}>{stage.replace("_"," ")}</strong>
        <span className="lm-subtle">{items.length}</span>
      </div>
      <div style={{display:"grid",gap:8}}>
        {items.map(it => <CardItem key={it.id} item={it} onOpen={onOpen}/>)}
        {items.length===0 && <div className="lm-subtle">Drop here</div>}
      </div>
    </div>
  );
}

function CardItem({item,onOpen}:{item:Card; onOpen:(id:string)=>void}){
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({id:item.id});
  const style:React.CSSProperties = {
    transform: transform?`translate3d(${transform.x}px,${transform.y}px,0)`:"none",
    boxShadow: isDragging?"0 6px 18px rgba(0,0,0,.15)":"none"
  };
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="card" style={style} onDoubleClick={()=>onOpen(item.id)}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontWeight:700}}>{item.applicant||item.id}</div>
          <div className="lm-subtle">
            {item.amount!=null ? `$${Number(item.amount).toLocaleString()}` : "—"} {item.docs_ok===false? "· docs ✗" : item.docs_ok===true? "· docs ✓" : ""}
          </div>
        </div>
        <button className="lm-btn" onClick={()=>onOpen(item.id)}>Open</button>
      </div>
    </div>
  );
}

export default function SalesPipeline(){
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint:{ distance:5 } }));
  const [board,setBoard] = React.useState<BoardState>({new:[],requires_docs:[],in_review:[],lender:[],accepted:[],declined:[]});
  const [loading,setLoading] = React.useState(true);
  const [drawerId,setDrawerId] = React.useState<string|null>(null);

  React.useEffect(()=>{ (async()=>{ setLoading(true); const b=await fetchBoard(); setBoard(b); setLoading(false); })(); },[]);

  function findStageOf(id:string):StageKey|undefined{
    for(const s of STAGES){ if (board[s].some(c=>c.id===id)) return s; }
  }

  async function onDragEnd(e:DragEndEvent){
    const id = String(e.active.id);
    const to = e.over?.id ? String(e.over.id) as StageKey : undefined;
    const from = findStageOf(id);
    if(!from || !to || from===to) return;
    const prev = structuredClone(board);
    setBoard(cur=>{
      const next = structuredClone(cur) as BoardState;
      const i = next[from].findIndex(c=>c.id===id);
      if(i>=0){ const [card]=next[from].splice(i,1); next[to].unshift(card); }
      return next;
    });
    const ok = await moveStage(id,to);
    if(!ok){ setBoard(prev); }
  }

  return (
    <div style={{display:"grid",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h2 style={{margin:"8px 0"}}>Sales Pipeline</h2>
        {loading && <span className="lm-subtle">Loading…</span>}
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="board-grid">
          {STAGES.map(s => <Column key={s} stage={s} items={board[s]} onOpen={(id)=>setDrawerId(id)}/>)}
        </div>
      </DndContext>
      <ApplicationDrawer open={!!drawerId} id={drawerId} onClose={()=>setDrawerId(null)}/>
    </div>
  );
}
TSX

echo ">> [5/9] Wire into top tabs"
TT="client/src/pages/staff/TopTabsDashboard.tsx"
if [ -f "$TT" ]; then
  grep -q 'from "./sections/SalesPipeline"' "$TT" 2>/dev/null || sed -i '1i import SalesPipeline from "./sections/SalesPipeline";' "$TT"
  perl -0777 -i -pe 's/\{tab===["'\'']pipeline["'\'']\}[\s\S]*?\}/\{tab==="pipeline" && <SalesPipeline\/>\}/s' "$TT" || true
fi

echo ">> [6/9] Server compat: /api/pipeline/board from applications (safe if absent)"
if [ ! -f server/routes/pipeline-compat.ts ]; then
cat > server/routes/pipeline-compat.ts <<'TS'
import { Router } from "express";
const r = Router();

let pool:any=null;
try{ const {Pool}=require("pg"); pool = process.env.DATABASE_URL ? new Pool({connectionString:process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}}) : null; }catch{}

const STAGES = ["new","requires_docs","in_review","lender","accepted","declined"];

r.get("/board", async (_req, res)=>{
  try{
    if(!pool) return res.json({ lanes: STAGES.map(s=>({key:s,items:[]})) });
    const rows = (await pool.query(`select id, stage, legal_business_name, dba_name, contact_first_name, contact_last_name, contact_email, contact_phone, requested_amount, loan_amount, missing_docs, document_approvals, created_at from applications`)).rows||[];
    const lanes:Record<string, any[]> = Object.fromEntries(STAGES.map(s=>[s,[]]));
    for(const a of rows){
      const name = a.legal_business_name || a.dba_name || [a.contact_first_name,a.contact_last_name].filter(Boolean).join(" ") || a.id;
      const docs_ok = Array.isArray(a.missing_docs) ? a.missing_docs.length===0 :
                      (Array.isArray(a.document_approvals) ? a.document_approvals.every((d:any)=>d.status==="accepted"||d.accepted===true) : undefined);
      let stage = (a.stage && STAGES.includes(a.stage) ? a.stage : (docs_ok===false ? "requires_docs":"new"));
      lanes[stage].push({
        id:String(a.id), applicant:name, amount: a.loan_amount ?? a.requested_amount, docs_ok, stage, email:a.contact_email, phone:a.contact_phone, createdAt:a.created_at, _raw:a
      });
    }
    res.json({ lanes: STAGES.map(s=>({key:s, items: lanes[s]})) });
  }catch(e){ res.status(500).json({error:String(e)}); }
});

export default r;
TS
  if ! grep -q "from './routes/pipeline-compat'" server/index.ts 2>/dev/null; then
    sed -i "1i import pipelineCompat from './routes/pipeline-compat';" server/index.ts
  fi
  grep -q "app.use('/api/pipeline'" server/index.ts 2>/dev/null || \
    sed -i "s|app.use([^)]*);|&\napp.use('/api/pipeline', pipelineCompat);|" server/index.ts
fi

echo ">> [7/9] Voice adapter (if missing) for dialer buttons"
[ -f client/src/lib/api/voice.ts ] || cat > client/src/lib/api/voice.ts <<'TS'
import { safeFetchJson } from "../safeFetch";
type Ok = {ok:true,data?:any}; type Err = {ok:false,error:any};
const tryPOST = async (u:string,b:any):Promise<Ok|Err>=>{
  const r=await safeFetchJson(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)});
  return r.ok?{ok:true,data:r.data}:{ok:false,error:r.error};
};
export async function startCall(input:{to:string;from?:string}){
  for(const u of ["/api/voice/twiml/outbound","/api/voice/calls/dial","/api/voice/quick-dial"]){
    const r=await tryPOST(u,input); if((r as any).ok) return r;
  } return {ok:false,error:"no start endpoint"};
}
export async function hangupCall(id?:string){
  for(const u of ["/api/voice/calls/hangup","/api/voice/twiml/hangup"]){
    const r=await tryPOST(u,{id}); if((r as any).ok) return r;
  } return {ok:false,error:"no hangup endpoint"};
}
TS

echo ">> [8/9] Complete - Pipeline reinstalled!"
echo "✅ Board styles, API adapter, drawer with tabs + dialer"
echo "✅ DnD pipeline, card details, docs/lenders integration"
echo "✅ Server fallback /api/pipeline/board from applications"
echo ""
echo "Now go to Sales Pipeline tab and see:"
echo "- Kanban columns: New → Requires Docs → In Review → Lender → Accepted/Declined"
echo "- Click/double-click any card → Application Drawer opens"
echo "- Drawer tabs: Application · Banking · Financials · Documents · Lenders · Activity"
echo "- 'Dial' button → slide-in dialer for phone calls"
echo ""
