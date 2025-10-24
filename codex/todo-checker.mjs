import fs from "node:fs";

const todoFile = "docs/staff_todo.md";
const reportFile = "reports/staff_todo_status.md";
if (!fs.existsSync(todoFile)) {
  console.warn("⚠️ No todo file found, skipping");
  process.exit(0);
}
const content = fs.readFileSync(todoFile, "utf8");
const lines = content.split("\n").filter(Boolean);
const report = ["# Staff To-Do Status", "", "Generated " + new Date().toISOString(), ""];
for (const line of lines) {
  const label = line.replace(/^[-*]\s*/, "");
  const found = fs.readdirSync("reports").some(f => f.includes(label.split(" ")[0].toLowerCase()) && f.includes("codex-"));
  const status = found ? "✅ Pass" : "❌ Pending";
  report.push(`| ${label} | ${status} |`);
}
report.push("");
fs.writeFileSync(reportFile, report.join("\n"));
console.log("✅ Wrote", reportFile);
