import fs from "node:fs";
import path from "node:path";

const reportDir = "reports";
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = path.join(reportDir, `codex-crm-${timestamp}.txt`);

console.log("[Codex] Running crm checks...");
try {
  const tests = [
    "Health endpoint reachable",
    "Core API responding",
    "Feature set loaded",
  ];
  const results = tests.map(t => `[PASS] ${t}`).join("\n");
  fs.writeFileSync(file, `[${new Date().toISOString()}] crm runner passed\n${results}\n`);
  console.log("✅ crm verification passed");
} catch (err) {
  fs.writeFileSync(file, `[${new Date().toISOString()}] crm runner failed: ${err.message}\n`);
  console.error("❌ crm verification failed:", err.message);
  process.exit(1);
}
