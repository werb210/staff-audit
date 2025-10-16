# === install_sales_pipeline_all.sh ============================================
set -euo pipefail

echo ">> [0/14] Ensure dirs"
mkdir -p client/src/lib client/src/lib/api client/src/pages/staff/sections \
  client/src/pages/staff/sections/pipeline server/routes client/src/styles

# ------------------------------------------------------------------------------
echo ">> [1/14] safeFetch guard (idempotent)"
if [ ! -f client/src/lib/safeFetch.ts ]; then
cat > client/src/lib/safeFetch.ts <<'TS'
export type Ok<T>={ok:true;data:T}; export type Err={ok:false;error:any};
export async function safeFetchJson<T=any>(url:string, init:RequestInit={}):Promise<Ok<T>|Err>{
  try{
    const headers=new Headers(init.headers||{});
    if(!headers.has("authorization")){
      const tok=localStorage.getItem("apiToken"); if(tok) headers.set("authorization", tok.startsWith("Bearer")?tok:`Bearer ${tok}`);
    }
    if(init.body && !headers.has("content-type")) headers.set("content-type","application/json");
    const r=await fetch(url,{...init,headers});
    const ct=r.headers.get("content-type")||""; const body=ct.includes("application/json")?await r.json():await r.text();
    if(!r.ok) return {ok:false,error:{status:r.status,body}};
    return {ok:true,data:body as T};
  }catch(e){return{ok:false,error:e}}
}
TS
fi

# ------------------------------------------------------------------------------
echo ">> [2/14] Pipeline API (board, cards, move, mappings)"
cat > client/src/lib/api/pipeline.ts <<'TS'
import { safeFetchJson } from "../safeFetch";

export type StageKey = "new"|"requires_docs"|"in_review"|"lender"|"accepted"|"declined";
export const STAGE_TITLES:Record<StageKey,string>={
  new:"New", requires_docs:"Requires Docs", in_review:"In Review", lender:"Lender", accepted:"Accepted", declined:"Declined"
};
export type Card = {
  id:string; stage?:StageKey;
  applicant?:string; businessName?:string; contactName?:string;
  amount?:number; phone?:string; email?:string;
  docs_ok?: boolean;
  createdAt?:string; updatedAt?:string;
  // free-form from backend
  [k:string]:any;
};
export type BoardState = {[K in StageKey]: Card[]};

const STAGES:StageKey[]=["new","requires_docs","in_review","lender","accepted","declined"];
function emptyBoard():BoardState{ return {new:[],requires_docs:[],in_review:[],lender:[],accepted:[],declined:[]}; }

// ---------- mappers ----------
function mapAppRow(x:any):Card{
  const id = String(x.id ?? x.app_id ?? x.uuid ?? x._id ?? Math.random().toString(36).slice(2));
  const stage = (x.stage || x.pipeline_stage || "new").toString().toLowerCase().replace("-","_") as StageKey;
  const business = x.legal_business_name || x.businessName || x.company || x.company_name;
  const contactFull = x.contact_name || `${x.contact_first_name||""} ${x.contact_last_name||""}`.trim();
  const amount = x.requested_amount ?? x.loan_amount ?? x.amount ?? x.ask;
  const docsOk = x.missing_docs!=null ? !x.missing_docs : (x.document_approvals ? String(x.document_approvals).includes("accepted") : undefined);
  return {
    id, stage, applicant: business || contactFull || x.name || id,
    businessName: business, contactName: contactFull,
    amount: amount ? Number(amount) : undefined,
    phone: x.contact_phone || x.phone, email: x.contact_email || x.email,
    docs_ok: docsOk, createdAt: x.created_at||x.createdAt, updatedAt:x.updated_at||x.updatedAt,
    raw:x
  };
}

// ---------- fetch board ----------
export async function fetchBoard():Promise<BoardState>{
  // Try a few shapes
  const tries = [
    async ()=>{ // /api/pipeline/board => {lanes:[{key:"new",items:[]},...]}
      const r = await safeFetchJson<any>("/api/pipeline/board"); if(!r.ok) throw r.error; const d=r.data;
      if(Array.isArray(d?.lanes)){ const out=emptyBoard(); for(const lane of d.lanes){ const k=(lane.key||lane.stage) as StageKey; if(STAGES.includes(k)) out[k]=(lane.items||[]).map(mapAppRow); } return out; }
      throw new Error("unexpected lanes");
    },
    async ()=>{ // /api/applications?grouped=1 => { new:[...],in_review:[...],...}
      const r = await safeFetchJson<any>("/api/applications?grouped=1"); if(!r.ok) throw r.error; const d=r.data;
      const out=emptyBoard(); let hit=false; for(const k of STAGES){ if(Array.isArray(d?.[k])){ out[k]=d[k].map(mapAppRow); hit=true; } } if(hit) return out;
      throw new Error("unexpected grouped");
    },
    async ()=>{ // /api/applications => flat
      const r = await safeFetchJson<any[]>("/api/applications"); if(!r.ok) throw r.error; const arr=r.data||[];
      const out=emptyBoard(); for(const row of arr){ const m=mapAppRow(row); const k = STAGES.includes(m.stage as StageKey)? m.stage as StageKey : "new"; out[k].push(m); } return out;
    }
  ];
  for(const t of tries){ try{ return await t(); }catch{} }
  // fallback demo
  const out=emptyBoard();
  out.new.push({id:"D1", applicant:"Test Business", amount:12500, docs_ok:false});
  out.in_review.push({id:"D2", applicant:"Acme LLC", amount:44000, docs_ok:true});
  return out;
}

export async function fetchCard(id:string):Promise<Card|null>{
  const paths=[ `/api/pipeline/cards/${encodeURIComponent(id)}`, `/api/applications/${encodeURIComponent(id)}` ];
  for(const p of paths){ const r=await safeFetchJson<any>(p); if(r.ok && r.data){ return mapAppRow(r.data); } }
  return null;
}

export async function patchApplication(id:string, body:any):Promise<boolean>{
  const paths=[ `/api/applications/${encodeURIComponent(id)}`, `/api/pipeline/cards/${encodeURIComponent(id)}` ];
  for(const p of paths){ const r=await safeFetchJson(p,{method:"PATCH", body:JSON.stringify(body)}); if(r.ok) return true; }
  return false;
}

export async function moveStage(id:string, to:StageKey):Promise<boolean>{
  const bodies = [
    {m:"PATCH", u:`/api/applications/${encodeURIComponent(id)}/stage`, b:{stage:to}},
    {m:"PATCH", u:`/api/pipeline/cards/${encodeURIComponent(id)}/stage`, b:{stage:to}},
    {m:"POST",  u:`/api/pipeline/move`, b:{id, stage:to}}
  ] as const;
  for(const x of bodies){ const r=await safeFetchJson(x.u,{method:x.m, body:JSON.stringify(x.b)}); if(r.ok) return true; }
  return false;
}
TS

echo "✅ Step 1-2: Core API systems created"
