#!/usr/bin/env node
import fs from "fs";
import { execSync } from "child_process";

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportDir = "reports";
const logPath = `${reportDir}/codex-functional-${timestamp}.txt`;
fs.mkdirSync(reportDir, { recursive: true });

const checks = [
  { label: "CRM Endpoints", cmd: "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/crm/contacts" },
  { label: "AI OCR Endpoint", cmd: "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/ai/ocr/test" },
  { label: "Lender Matching", cmd: "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/lenders/match" },
  { label: "Communication Center", cmd: "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/communications/status" },
  { label: "Marketing Tab", cmd: "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/marketing/ping" },
  { label: "Reports Tab", cmd: "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/reports/summary" },
  { label: "Settings Integrations", cmd: "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/settings/integrations" }
];

fs.appendFileSync(logPath, `CODEx Functional Coverage Test\n${new Date().toISOString()}\n`);

for (const check of checks) {
  try {
    const code = execSync(check.cmd).toString().trim();
    const result = code === "200" ? "✅" : "❌";
    fs.appendFileSync(logPath, `${result} ${check.label} → HTTP ${code}\n`);
  } catch (error) {
    fs.appendFileSync(logPath, `❌ ${check.label} → failed\n`);
  }
}

console.log(`Functional verification complete. See ${logPath}`);
