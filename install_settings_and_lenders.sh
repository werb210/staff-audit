#!/bin/bash
set -euo pipefail

echo '>> [0/16] Ensure folders'
mkdir -p client/src/styles          client/src/lib/api          client/src/lib/rbac          client/src/pages/staff/sections          client/src/pages/staff/sections/settings          client/src/pages/staff/sections/lenders          server/routes

# ------------------------------------------------------------------------------
echo '>> [1/16] Base utilities (safeFetch, style import)'
if [ ! -f client/src/lib/safeFetch.ts ]; then
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
    const body=ct.includes('application/json')?await r.json():await r.text();
    if(!r.ok) return {ok:false,error:{status:r.status,body}};
    return {ok:true,data:body as T};
  }catch(e){return{ok:false,error:e}}
}
TS
fi
grep -q 'styles/brand.css' client/src/main.tsx 2>/dev/null || sed -i '1i import "./styles/brand.css";' client/src/main.tsx

echo '>> Settings installer complete'
