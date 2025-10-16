#!/usr/bin/env node
/* eslint-disable no-console */
const API = process.env.API_BASE || 'http://localhost:5000/api';
async function jget(p){ const r=await fetch(`${API}${p}`,{credentials:'include'}); if(!r.ok) throw new Error(p+':'+r.status); return r.json(); }
function isUuid(s){ return typeof s==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s); }
async function pickId(){
  const b = await jget('/pipeline/board').catch(()=>null); if(!b) throw new Error('no board');
  const ids=new Set(); const st=[b];
  while(st.length){ const x=st.pop();
    if(Array.isArray(x)){ for(const v of x) st.push(v); continue; }
    if(x && typeof x==='object'){ for(const[k,v] of Object.entries(x)){ if((k==='applicationId'||k==='id') && isUuid(v)) ids.add(v); if(v && typeof v==='object') st.push(v); } }
  }
  const arr=[...ids]; if(!arr.length) throw new Error('no ids'); return arr[0];
}
(async()=>{
  const args=process.argv.slice(2);
  let id = args.includes('--app') ? args[args.indexOf('--app')+1] : null;
  if(!id && args.includes('--latest')) id = await pickId();
  if(!id) throw new Error('Usage: npm run field:report -- --app <uuid> | --latest');
  const app = await jget(`/pipeline/cards/${id}?presence=1`);
  const pres = app.__canonical?.presence || {};
  const stages = {
    AcceptedViaAPI: ['product_id','country','product_category','amount_requested','years_in_business','months_in_business','annual_revenue','monthly_revenue','business_legal_name','industry','contact_name','contact_email','contact_phone','documents'],
    PDFGenerator: ['business_legal_name','business_trade_name','amount_requested','contact_email','contact_phone','business_street','business_city','business_state','business_postal_code','business_website','country','product_category'],
    CreditSummary: ['business_legal_name','country','amount_requested','annual_revenue','monthly_revenue','years_in_business','months_in_business','industry','business_website'],
    ApplicationCard: ['business_legal_name','product_category','amount_requested','country','contact_name','contact_email','contact_phone'],
    LenderTransmission: ['product_id','country','product_category','amount_requested','annual_revenue','monthly_revenue','years_in_business','months_in_business','business_legal_name','industry','contact_name','contact_email','contact_phone','business_street','business_city','business_state','business_postal_code','business_website','documents']
  };
  console.log(`[Presence] Application ${id}`);
  for(const [stage, keys] of Object.entries(stages)){
    const have = keys.filter(k => pres[k]);
    const miss = keys.filter(k => !pres[k]);
    console.log(`\n${stage}: ${have.length}/${keys.length} present`);
    console.log('PRESENT:', have.join(', ') || '(none)');
    console.log('MISSING:', miss.join(', ') || '(none)');
  }
})();