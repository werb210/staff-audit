import fs from "node:fs";
import path from "node:path";

const dir = "reports";
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, "staff_codex_master_report.md");
const files = fs.readdirSync(dir).filter(f => f.startsWith("codex-"));
const summary = ["# Staff Codex Master Report", "", "Generated " + new Date().toISOString(), ""];

for (const f of files.sort()) {
  const p = path.join(dir, f);
  summary.push(`## ${f}`);
  summary.push("```");
  summary.push(fs.readFileSync(p, "utf8"));
  summary.push("```", "");
}
fs.writeFileSync(out, summary.join("\n"));
console.log("✅ Master report generated:", out);
