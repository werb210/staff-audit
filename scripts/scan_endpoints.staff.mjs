import fs from 'fs';
const APP_URL = process.env.APP_URL || 'https://staff.boreal.financial';
const BASE = `${APP_URL.replace(/\/+$/,'')}/api`;
const TOK  = process.env.CLIENT_SHARED_BEARER || '';
const HEAD = TOK ? { Authorization:`Bearer ${TOK}` } : {};
async function j(url,opt={}){ const r=await fetch(url,{...opt,headers:{...(opt.headers||{}),...HEAD}}); const ct=r.headers.get('content-type')||''; let b=null; try{b=ct.includes('json')?await r.json():await r.text();}catch{}; return {url,status:r.status,ok:r.ok,ct,body:b}; }
const eps=[['GET','/v1/products'],['GET','/lenders'],['GET','/required-docs'],['POST','/applications/validate-intake']];
const rep={base:BASE,when:new Date().toISOString(),results:[]};
for (const [m,p] of eps){ const u=BASE+p; try{ const r= m==='GET'? await j(u): await j(u,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}); rep.results.push({m,p,status:r.status,ok:r.ok,ct:r.ct,count:Array.isArray(r.body)?r.body.length:null,sample:Array.isArray(r.body)?r.body[0]:r.body}); }catch(e){ rep.results.push({m,p,error:String(e)}); } }
fs.mkdirSync('reports',{recursive:true}); fs.writeFileSync('reports/api_inventory_staff.json',JSON.stringify(rep,null,2));
let md=`# Staff API Inventory\n\n- Base: ${rep.base}\n- When: ${rep.when}\n\n| method | path | status | ok | ct | count/sample |\n|---|---|---:|:--:|---|---|\n`; for (const r of rep.results){ md+=`| ${r.m} | \`${r.p}\` | ${r.status??''} | ${r.ok?'✅':'❌'} | ${r.ct??''} | ${(r.count??(r.sample?'`sample`':''))} |\n`; } fs.writeFileSync('reports/api_inventory_staff.md',md); console.log('✅ wrote staff inventory');