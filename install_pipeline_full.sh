#!/bin/bash
set -euo pipefail

echo '>> [0/12] Ensure dirs'
mkdir -p client/src/lib/api          client/src/pages/staff/sections/pipeline          server/routes          client/src/styles

# ------------------------------------------------------------------------------
echo '>> [1/12] Safe fetch (idempotent)'
if [ ! -f client/src/lib/safeFetch.ts ]; then
cat > client/src/lib/safeFetch.ts <<'TS'
export type Ok<T>={ok:true;data:T}; export type Err={ok:false;error:any};
export async function safeFetchJson<T=any>(url:string, init:RequestInit={}):Promise<Ok<T>|Err>{
  try{
    const headers=new Headers(init.headers||{});
    if(!headers.has('authorization')){
      const tok=localStorage.getItem('apiToken');
      if(tok) headers.set('authorization', tok.startsWith('Bearer')?tok:`Bearer ${tok}`);
    }
    init.headers=headers;
    const r=await fetch(url, init);
    const ct=r.headers.get('content-type')||'';
    const body=ct.includes('application/json')?await r.json():await r.text();
    if(!r.ok) return {ok:false,error:{status:r.status,body}};
    return {ok:true,data:body as T};
  }catch(e){return{ok:false,error:e}}
}
TS
fi

# ------------------------------------------------------------------------------
echo '>> [2/12] Pipeline + Docs API adapters (real-first, compat fallback)'
cat > client/src/lib/api/pipeline.ts <<'TS'
import { safeFetchJson } from '../safeFetch';

export type StageKey = 'new'|'requires_docs'|'in_review'|'lender'|'accepted'|'declined';
export type BoardLane = { key:StageKey; title:string; count?:number; cards:AppCard[] };
export type AppCard = {
  id:string; name:string; applicant?:string; amount?:number; stage:StageKey;
  docs_ok?:boolean; updatedAt?:string;
};

export async function fetchBoard():Promise<BoardLane[]>{
  const tries=['/api/pipeline/board','/api/applications/board','/api/compat/pipeline/board'];
  for(const u of tries){ const r=await safeFetchJson<BoardLane[]>(u); if(r.ok && Array.isArray(r.data)) return r.data; }
  return [];
}

export async function moveCard(cardId:string, to:StageKey, idx:number){
  const body={ to, index: idx };
  const tries=[
    {m:'PATCH',u:`/api/pipeline/cards/${cardId}/move`},
    {m:'PATCH',u:`/api/applications/${cardId}/move`},
    {m:'POST',u:`/api/compat/pipeline/cards/${cardId}/move`}
  ];
  for(const t of tries){ const r=await safeFetchJson<any>(t.u,{method:t.m as any, headers:{'content-type':'application/json'}, body:JSON.stringify(body)}); if(r.ok) return true; }
  return false;
}

export type CardDetail = {
  id:string; stage:StageKey; applicant?:string; legalBusinessName?:string;
  requestedAmount?:number; contactEmail?:string; contactPhone?:string;
  bankingAnalysis?:any; financialsOcr?:any;
  documents?: DocRow[]; lenders?: LenderRec[];
};
export type DocRow = { id:string; name:string; type?:string; status?: 'pending'|'accepted'|'rejected'; size?:number; uploadedAt?:string };
export type LenderRec = { id:string; name:string; product?:string; likelihood?:number };

export async function fetchCard(id:string):Promise<CardDetail|null>{
  const tries=[`/api/pipeline/cards/${id}`,`/api/applications/${id}`,`/api/compat/pipeline/cards/${id}`];
  for(const u of tries){ const r=await safeFetchJson<CardDetail>(u); if(r.ok && r.data?.id) return r.data; }
  return null;
}

export async function sendToLender(appId:string, lenderId:string){
  for(const u of [`/api/lenders/send`,`/api/compat/lenders/send`]){
    const r=await safeFetchJson<any>(u,{method:'POST',headers:{'content-type':'application/json'}, body:JSON.stringify({appId,lenderId})});
    if(r.ok) return true;
  }
  return false;
}
TS

cat > client/src/lib/api/docs.ts <<'TS'
import { safeFetchJson } from '../safeFetch';

export async function getZip(appId:string){
  for(const u of [`/api/public/download-all/${appId}`, `/api/pipeline/cards/${appId}/docs.zip`, `/api/compat/public/download-all/${appId}`]){
    const r=await fetch(u); if(r.ok) return r.blob();
  }
  throw new Error('zip download failed');
}

export async function getPreviewUrl(docId:string):Promise<string|null>{
  for(const u of [`/api/public/s3-access/${docId}`, `/api/documents/${docId}/access`, `/api/compat/public/s3-access/${docId}`]){
    const r=await safeFetchJson<any>(u); if(r.ok && (r.data?.url||r.data?.signedUrl)) return r.data.url||r.data.signedUrl;
  }
  return null;
}

export async function acceptDoc(docId:string){
  for(const t of [
    {m:'POST', u:`/api/documents/${docId}/accept`},
    {m:'POST', u:`/api/compat/documents/${docId}/accept`}
  ]){ const r=await safeFetchJson<any>(t.u,{method:t.m as any}); if(r.ok) return true; }
  return false;
}
export async function rejectDoc(docId:string, reason?:string){
  for(const t of [
    {m:'POST', u:`/api/documents/${docId}/reject`},
    {m:'POST', u:`/api/compat/documents/${docId}/reject`}
  ]){ const r=await safeFetchJson<any>(t.u,{method:t.m as any, headers:{'content-type':'application/json'}, body:JSON.stringify({reason})}); if(r.ok) return true; }
  return false;
}

export async function reassignDoc(docId:string, applicationId:string){
  for(const t of [
    {m:'POST', u:`/api/admin/documents/reassign/${docId}`},
    {m:'POST', u:`/api/compat/admin/documents/reassign/${docId}`}
  ]){ const r=await safeFetchJson<any>(t.u,{method:t.m as any, headers:{'content-type':'application/json'}, body:JSON.stringify({applicationId})}); if(r.ok) return true; }
  return false;
}

export async function uploadDoc(applicationId:string, file:File){
  const targets=[`/api/public/s3-upload/${applicationId}`, `/api/compat/public/s3-upload/${applicationId}`];
  const fd=new FormData(); fd.append('file', file);
  for(const u of targets){ const r=await fetch(u,{method:'POST', body:fd}); if(r.ok) return true; }
  return false;
}
TS

echo '>> Pipeline API files created'
