#!/usr/bin/env node
import { execSync } from "child_process";

console.log("=== Codex Full Run: Hygiene + V1 Feature Verification ===");
try {
  execSync("node scripts/codex-audit.js", { stdio: "inherit" });
} catch (error) {
  console.error("codex-audit failed", error?.message ?? "");
}
try {
  execSync("node scripts/codex-functional.js", { stdio: "inherit" });
} catch (error) {
  console.error("codex-functional failed", error?.message ?? "");
}
console.log("=== Codex Full Run Complete ===");
