#!/bin/bash
set -euo pipefail

echo '>> [0/14] Ensure dirs'
mkdir -p client/src/lib/api          client/src/pages/staff/sections/marketing          server/routes          client/src/styles

# Create the Marketing API files
cat > client/src/lib/api/linkedin.ts <<'TS'
import { safeFetchJson } from '../safeFetch';

export type LiStepType = 'VISIT'|'FOLLOW'|'CONNECT'|'DELAY'|'MESSAGE'|'INMAIL'|'LIKE'|'COMMENT'|'ENDORSE'|'STOP_IF_REPLIED';
export type LiStep = { id?:string; kind:LiStepType; text?:string; delayHours?:number; skill?:string; };
export type LiSequence = {
  id?:string; name:string; targetQuery?:string; dailyLimit?:number; warmupPerDay?:number;
  workingHours?:{start:string; end:string}; autoStopOnReply?:boolean; steps:LiStep[];
  status?: 'draft'|'running'|'paused'|'completed';
};
export async function liListSequences(){ for(const u of ['/api/linkedin/sequences','/api/marketing/linkedin/sequences','/api/compat/linkedin/sequences']){ const r=await safeFetchJson<any[]>(u); if(r.ok && Array.isArray(r.data)) return r.data; } return []; }
export async function liSaveSequence(seq:LiSequence){
  const body=seq;
  for(const u of ['/api/linkedin/sequences','/api/marketing/linkedin/sequences','/api/compat/linkedin/sequences']){
    const r=await safeFetchJson<any>(u,{method: seq.id?'PATCH':'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body)});
    if(r.ok) return true;
  } return false;
}
export async function liAction(id:string, action:'start'|'pause'|'resume'|'stop'){
  for(const u of [`/api/linkedin/sequences/${id}/${action}`,`/api/marketing/linkedin/sequences/${id}/${action}`,`/api/compat/linkedin/sequences/${id}/${action}`]){
    const r=await safeFetchJson<any>(u,{method:'POST'}); if(r.ok) return true;
  } return false;
}
TS

cat > client/src/lib/api/googleAds.ts <<'TS'
import { safeFetchJson } from '../safeFetch';
export type GAdsCampaign={ id?:string; name:string; budgetDaily:number; status?:'enabled'|'paused'; objective?:'LEADS'|'SALES'|'TRAFFIC' };
export type GAdsAdGroup={ id?:string; campaignId:string; name:string; cpcMax?:number; status?:'enabled'|'paused' };
export type GAdsAd={ id?:string; adGroupId:string; headline:string; desc:string; finalUrl:string; status?:'enabled'|'paused' };

export async function gadsStatus(){ for(const u of ['/api/google/ads/status','/api/compat/google/ads/status']){ const r=await safeFetchJson<any>(u); if(r.ok) return r.data; } return {connected:false, account:null}; }
export async function gadsConnect(){ for(const u of ['/api/google/ads/connect','/api/compat/integrations/google-ads/connect']){ const r=await safeFetchJson<any>(u,{method:'POST'}); if(r.ok) return true; } return false; }
export async function gadsDisconnect(){ for(const u of ['/api/google/ads/disconnect','/api/compat/integrations/google-ads/disconnect']){ const r=await safeFetchJson<any>(u,{method:'POST'}); if(r.ok) return true; } return false; }

export async function listCampaigns(){ for(const u of ['/api/google/ads/campaigns','/api/compat/google/ads/campaigns']){ const r=await safeFetchJson<any[]>(u); if(r.ok && Array.isArray(r.data)) return r.data; } return []; }
export async function saveCampaign(c:GAdsCampaign){ for(const u of ['/api/google/ads/campaigns','/api/compat/google/ads/campaigns']){ const r=await safeFetchJson<any>(u,{method: c.id?'PATCH':'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(c)}); if(r.ok) return true; } return false; }
export async function setCampaignStatus(id:string, status:'enabled'|'paused'){ for(const u of [`/api/google/ads/campaigns/${id}/status`,`/api/compat/google/ads/campaigns/${id}/status`]){ const r=await safeFetchJson<any>(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({status})}); if(r.ok) return true; } return false; }

export async function listAdGroups(campaignId:string){ for(const u of [`/api/google/ads/campaigns/${campaignId}/adgroups`,`/api/compat/google/ads/campaigns/${campaignId}/adgroups`]){ const r=await safeFetchJson<any[]>(u); if(r.ok && Array.isArray(r.data)) return r.data; } return []; }
export async function saveAdGroup(g:GAdsAdGroup){ for(const u of ['/api/google/ads/adgroups','/api/compat/google/ads/adgroups']){ const r=await safeFetchJson<any>(u,{method: g.id?'PATCH':'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(g)}); if(r.ok) return true; } return false; }

export async function listAds(adGroupId:string){ for(const u of [`/api/google/ads/adgroups/${adGroupId}/ads`,`/api/compat/google/ads/adgroups/${adGroupId}/ads`]){ const r=await safeFetchJson<any[]>(u); if(r.ok && Array.isArray(r.data)) return r.data; } return []; }
export async function saveAd(a:GAdsAd){ for(const u of ['/api/google/ads/ads','/api/compat/google/ads/ads']){ const r=await safeFetchJson<any>(u,{method: a.id?'PATCH':'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(a)}); if(r.ok) return true; } return false; }
TS

echo '>> Marketing API files created'
