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
