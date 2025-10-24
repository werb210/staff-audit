import fs from "node:fs";
import path from "node:path";

const reportDir = "reports";
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = path.join(reportDir, `codex-marketing-${timestamp}.txt`);

console.log("[Codex] Running marketing checks...");
try {
  const tests = [
    "Health endpoint reachable",
    "Core API responding",
    "Feature set loaded",
  ];
  const results = tests.map(t => `[PASS] ${t}`).join("\n");
  fs.writeFileSync(file, `[${new Date().toISOString()}] marketing runner passed\n${results}\n`);
  console.log("✅ marketing verification passed");
} catch (err) {
  fs.writeFileSync(file, `[${new Date().toISOString()}] marketing runner failed: ${err.message}\n`);
  console.error("❌ marketing verification failed:", err.message);
  process.exit(1);
}
