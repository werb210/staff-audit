import fs from "fs";
import path from "path";

const ROOT = process.env.SRC_ROOT || "client/src";
const OUT  = "reports/FALLBACK_AUDIT.json";

const PATTERNS = [
  /Using fallback/i,
  /fallback data/i,
  /useMock/i,
  /mockData/i,
  /fixtures?/i,
  /sampleData/i,
  /DEV_ONLY/i,
  /__mocks__/i,
  /if\s*\(!\s*res\.ok\s*\)/i,
  /catch\s*\([^)]*\)\s*{[^}]*return[^;]*(mock|fixture|sample)/is,
];

type Hit = { file: string; line: number; preview: string };
const hits: Record<string, Hit[]> = {};

function scanFile(file: string) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    for (const p of PATTERNS) {
      if (p.test(L)) {
        (hits[file] ||= []).push({
          file,
          line: i + 1,
          preview: L.trim().slice(0, 240),
        });
        break;
      }
    }
  }
}

function walk(dir: string) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(p);
    } else if (/\.(ts|tsx|js|jsx)$/.test(e.name)) {
      scanFile(p);
    }
  }
}

fs.mkdirSync("reports", { recursive: true });
walk(ROOT);

const files = Object.keys(hits);
const totalHits = files.reduce((a,f)=>a+hits[f].length,0);

// basic bucketing by feature path
const bucket = (f:string) => {
  if (f.includes("/lenders")) return "Lenders";
  if (f.includes("/products")) return "LenderProducts";
  if (f.includes("/contacts")) return "Contacts";
  if (f.includes("/applications")||f.includes("/pipeline")) return "Pipeline";
  if (f.includes("/documents")||f.includes("/files")) return "Documents";
  if (f.includes("/reports")) return "Reports";
  if (f.includes("/settings")||f.includes("/system")) return "Settings";
  if (f.includes("/tasks")||f.includes("/crm")) return "CRM";
  return "Other";
};
const byArea: Record<string,string[]> = {};
for (const f of files) (byArea[bucket(f)] ||= []).push(f);

const report = {
  scannedRoot: ROOT,
  totalFilesFlagged: files.length,
  totalMatches: totalHits,
  areas: Object.fromEntries(Object.entries(byArea).map(([k,v])=>[k,[...new Set(v)].sort()])),
  files: hits,
};
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log("✅ Wrote", OUT);
console.log("Files flagged:", files.length, "Total matches:", totalHits);
console.table(Object.entries(byArea).map(([k,v])=>({area:k, files:new Set(v).size})));