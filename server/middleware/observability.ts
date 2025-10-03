import type { Request, Response, NextFunction } from "express";
import * as prom from "prom-client";
import { postSlack } from "../services/alerts/slack";

// ----- Request ID -----
function genId(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
export function requestId(req:Request, res:Response, next:NextFunction){
  const id = (req.headers["x-request-id"] as string) || genId();
  (req as any).id = id;
  res.setHeader("x-request-id", id);
  next();
}

// ----- Redaction (very light) -----
function redact(s:string){
  return s
    // emails
    .replace(/([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/ig, "***@***")
    // long digit strings (cards/accounts)
    .replace(/\b\d{12,19}\b/g, (m)=> m.slice(0,2) + "****" + m.slice(-2))
    // ssn-ish
    .replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, "***-**-****");
}

// ----- Metrics registry -----
const METRICS_ON = String(process.env.METRICS_ENABLED||"true").toLowerCase()==="true";
const register = new prom.Registry();
prom.collectDefaultMetrics({ register, prefix: "node_" });

const reqCounter = new prom.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method","path","code"],
});
const reqDuration = new prom.Histogram({
  name: "http_request_duration_seconds",
  help: "Request duration in seconds",
  labelNames: ["method","path","code"],
  buckets: [0.01,0.025,0.05,0.1,0.25,0.5,1,2,5],
});
register.registerMetric(reqCounter);
register.registerMetric(reqDuration);

// ----- Request timing + structured logging -----
export function metricsAndLogs(req:Request, res:Response, next:NextFunction){
  const start = process.hrtime.bigint();
  const id = (req as any).id || "-";
  const path = (req as any).route?.path || req.path || req.url || "/";
  const method = req.method;

  function done(){
    const durNs = Number(process.hrtime.bigint() - start);
    const durSec = durNs / 1e9;
    const code = res.statusCode;
    try {
      reqCounter.labels(method, path, String(code)).inc();
      reqDuration.labels(method, path, String(code)).observe(durSec);
    } catch {}

    // sample successes
    const sample = Number(process.env.LOG_SAMPLE_RATE || "1");
    const shouldLog = code >= 500 || Math.random() < Math.max(0, Math.min(1, sample));
    if (shouldLog){
      const payload = {
        t: new Date().toISOString(),
        lvl: code >= 500 ? "error" : (code >= 400 ? "warn" : "info"),
        id, method, path, code, ms: Math.round(durSec*1000),
        ua: (req.headers["user-agent"] || ""),
        ip: (req.headers["x-forwarded-for"] || (req.socket && (req.socket as any).remoteAddress) || ""),
      };
      try {
        const q = Object.keys(req.query||{}).length ? ("?"+new URLSearchParams(req.query as any).toString()) : "";
        const m = JSON.stringify(payload) + " " + redact(method + " " + path + q);
        console.log(m);
      } catch {
        console.log(JSON.stringify(payload));
      }
    }
  }

  res.on("finish", done);
  res.on("close", done);
  next();
}

// ----- Error trap with Slack alert -----
export function errorTrap(err:any, req:Request, res:Response, next:NextFunction){
  try {
    const id = (req as any).id || "-";
    const msg = `[${id}] 500 at ${req.method} ${req.path} — ${err?.message || err}`;
    console.error(msg);
    if (process.env.ALERTS_SLACK_WEBHOOK) {
      postSlack(`:rotating_light: ${msg}\n\`\`\`${(err?.stack||"").slice(0,1800)}\`\`\``);
    }
  } catch {/* no-op */}
  res.status(500).json({ error:"internal_error", request_id: (req as any).id || "-" });
}

// ----- /metrics handler (optional basic auth) -----
export async function metricsHandler(req:Request, res:Response){
  if (!METRICS_ON) return res.status(404).end();
  const ba = (process.env.METRICS_BASIC_AUTH||"").trim();
  if (ba) {
    const hdr = String(req.headers.authorization||"");
    const ok = hdr.startsWith("Basic ") && Buffer.from(hdr.slice(6), "base64").toString("utf8") === ba;
    if (!ok) { res.setHeader("WWW-Authenticate","Basic"); return res.status(401).end("auth"); }
  }

  // Compose base metrics
  res.setHeader("Content-Type", register.contentType);
  const base = await register.metrics();

  // Optional: append lightweight queue metrics (from status endpoint) if available
  let extra = "";
  try {
    const r = await fetch(`${req.protocol}://${req.get("host")}/api/ops/queues/status`);
    if (r.ok) {
      const j:any = await r.json();
      if (j.enabled && Array.isArray(j.queues)) {
        extra += "\n# TYPE queue_up gauge\n";
        for (const q of j.queues) {
          extra += `queue_up{name="${q.name}"} ${q.bull?1:0}\n`;
        }
      }
    }
  } catch {}

  res.end(base + extra);
}

// ----- Liveness/Readiness -----
export function live(_req:Request, res:Response){ res.status(200).json({ ok:true, ts:new Date().toISOString() }); }
export function ready(_req:Request, res:Response){ 
  // Minimal readiness: extend to include DB ping if desired
  res.status(200).json({ ready:true, ts:new Date().toISOString() }); 
}