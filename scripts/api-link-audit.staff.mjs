import fs from "fs";
import http from "http";
import https from "https";

const BASE = process.env.APP_URL || "http://localhost:5000";
const clientProbePath = process.env.CLIENT_PROBE_PATH || "../client/reports/client_api_probe.json";
let clientCalls = [];
try {
  const raw = fs.readFileSync(clientProbePath, "utf8");
  clientCalls = JSON.parse(raw);
} catch {
  // fallback: use route list if available
  try {
    const raw = fs.readFileSync("reports/staff__int_routes.json","utf8");
    const o = JSON.parse(raw);
    if (o.routes) {
      clientCalls = o.routes.flatMap(r => (r.methods||[]).map(m => ({url: BASE.replace(/\/+$/,"") + (r.path.startsWith("/")? r.path : "/"+r.path), method:m})));
    }
  } catch {}
}

const uniq = (arr, key) => {
  const seen = new Set(); const out=[];
  for (const x of arr) { const k=key(x); if(!seen.has(k)){seen.add(k); out.push(x);} }
  return out;
};

clientCalls = uniq(
  clientCalls
    .filter(x => x && x.url && /\/api\//.test(x.url))
    .map(x => ({url: x.url, method: (x.method||"GET").toUpperCase()})),
  x => `${x.method} ${x.url}`
);

function probe(url, method="GET", headers={}, body=null) {
  return new Promise((resolve) => {
    try {
      const lib = url.startsWith("https") ? https : http;
      const u = new URL(url);
      const req = lib.request({
        method, hostname:u.hostname, port:u.port || (u.protocol==="https:"?443:80), path:u.pathname + (u.search||""),
        headers: Object.assign({"Accept":"application/json"}, headers)
      }, (res) => {
        let data=""; res.on("data", c => data += c);
        res.on("end", () => resolve({status:res.statusCode, headers:res.headers, body:data.slice(0,1000)}));
      });
      req.on("error", (e) => resolve({error:e.message}));
      if (body) req.write(body);
      req.end();
    } catch(e){ resolve({error:String(e)}); }
  });
}

(async () => {
  const out=[];
  for (const x of clientCalls) {
    // Try OPTIONS for CORS, then declared method
    const opts = await probe(x.url, "OPTIONS");
    const main = await probe(x.url, x.method, (x.method!=="GET"?{"Content-Type":"application/json"}:{}), x.method!=="GET"? JSON.stringify({ping:"staff-diagnostic"}) : null);
    const h = main.headers||{};
    out.push({
      source:"staff",
      url:x.url,
      method:x.method,
      optionsStatus: opts?.status ?? null,
      status: main?.status ?? null,
      cors: {
        allowOrigin: h["access-control-allow-origin"]||null,
        allowMethods: h["access-control-allow-methods"]||null,
        allowHeaders: h["access-control-allow-headers"]||null,
        vary: h["vary"]||null
      },
      error: main?.error ?? null,
      bodySnippet: main?.body ?? null,
      time: new Date().toISOString()
    });
  }
  fs.writeFileSync("reports/staff_api_probe.json", JSON.stringify(out,null,2));
  console.log("✅ Wrote reports/staff_api_probe.json with", out.length, "entries.");
})();