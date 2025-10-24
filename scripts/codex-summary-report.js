import fs from "node:fs";
import path from "node:path";

const reportDir = "reports";
const outFile = path.join(reportDir, "staff_installed_features_status.md");
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

const sections = [
  "Settings Management System",
  "RBAC System",
  "Lenders Management",
  "Authentication & Access",
  "Contacts (3-pane) CRM",
  "Communication Hub",
  "Sales Pipeline",
  "Documents Platform",
  "Marketing Center",
  "Analytics Stack",
  "Security & Compliance",
  "Platform Infrastructure",
];

// Helper to mark pass/fail based on log content
function classify(content, label) {
  const lower = content.toLowerCase();
  if (lower.includes(label.toLowerCase()) && lower.includes("pass")) return "✅ Pass";
  if (lower.includes(label.toLowerCase()) && lower.includes("fail")) return "❌ Fail";
  return "⚠️ Not Tested";
}

// Find newest report
const files = fs
  .readdirSync(reportDir)
  .filter(f => f.startsWith("codex-functional") || f.startsWith("codex-audit"))
  .map(f => path.join(reportDir, f))
  .sort((a, b) => fs.statSync(b).mtime - fs.statSync(a).mtime);
const latest = files[0];
const content = latest ? fs.readFileSync(latest, "utf8") : "";

const lines = [
  "# Staff Application Installed Features — Pass/Fail Report",
  "",
  "Generated at " + new Date().toISOString(),
  "",
  "| Feature Area | Status |",
  "|---------------|--------|",
  ...sections.map(s => `| ${s} | ${classify(content, s)} |`),
];

fs.writeFileSync(outFile, lines.join("\n"));
console.log("✅ Updated:", outFile);
