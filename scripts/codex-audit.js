#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const args = process.argv.slice(2);
const fixMode = args.includes("--fix");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.resolve(__dirname, "../codex.config.json");
if (!fs.existsSync(configPath)) {
  console.error("codex.config.json not found. Run setup first.");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const reportDir = config.reportsDir ?? "reports";
fs.mkdirSync(reportDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logPath = path.join(reportDir, `codex-run-${timestamp}.txt`);

const log = (message = "") => {
  fs.appendFileSync(logPath, message + "\n");
  console.log(message);
};

log("CODEx Hygiene Audit");
log(new Date().toISOString());
log();

let success = true;

const packageJsonPath = path.resolve(__dirname, "../package.json");

function readAvailablePackages() {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  return {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.optionalDependencies ?? {}),
  };
}

function removeDuplicateRouteBackups(routeRoot) {
  if (!fs.existsSync(routeRoot)) return [];

  const patterns = [/\.bak\./i, /\.backup\./i, /\.old\./i, /\.duplicate\./i];
  const removed = [];
  const queue = [routeRoot];

  while (queue.length) {
    const current = queue.pop();
    if (!current) continue;
    const stats = fs.statSync(current);
    if (stats.isDirectory()) {
      for (const entry of fs.readdirSync(current)) {
        queue.push(path.join(current, entry));
      }
      continue;
    }

    const fileName = path.basename(current);
    if (patterns.some((pattern) => pattern.test(fileName))) {
      fs.unlinkSync(current);
      removed.push(path.relative(process.cwd(), current));
    }
  }

  return removed.sort();
}

function ensureDocumentEnumSync(schemaPath) {
  if (!fs.existsSync(schemaPath)) return false;
  const original = fs.readFileSync(schemaPath, "utf8");
  let updated = original;

  if (!/DOCUMENT_TYPES/.test(updated)) {
    const importLine = "import { DOCUMENT_TYPES } from './documentTypes';";
    updated = `${importLine}\n${updated}`;
  }

  const enumRegex = /pgEnum\('document_type',\s*\[[^\]]*\]\s*\)/m;
  if (enumRegex.test(updated)) {
    updated = updated.replace(enumRegex, "pgEnum('document_type', DOCUMENT_TYPES)");
  }

  if (updated !== original) {
    fs.writeFileSync(schemaPath, updated);
    return true;
  }

  return false;
}

function reinstallMissingPackages(missing) {
  if (!missing.length) {
    return { success: true, messages: [] };
  }

  try {
    log(`🔧 Installing missing packages: ${missing.join(", ")}`);
    execSync(`npm install ${missing.join(" ")}`, { stdio: "inherit" });
    return { success: true, messages: ["✅ Dependencies reinstalled"] };
  } catch (error) {
    const message = error?.message ?? "unknown error";
    return { success: false, messages: [`❌ Failed to install dependencies: ${message}`] };
  }
}

function applyAutoFixes(context) {
  const messages = [];
  const routeRoot = path.resolve(__dirname, "../server/routes");
  const schemaPath = path.resolve(__dirname, "../shared/schema.ts");

  const removed = removeDuplicateRouteBackups(routeRoot);
  if (removed.length) {
    messages.push(`✅ Removed duplicate route backups (${removed.length})`);
    removed.forEach((file) => messages.push(`   • ${file}`));
  } else {
    messages.push("ℹ️ No duplicate route backups detected");
  }

  if (ensureDocumentEnumSync(schemaPath)) {
    messages.push("✅ Synchronized document_type enum with canonical source");
  } else {
    messages.push("ℹ️ document_type enum already aligned with canonical source");
  }

  const reinstallResult = reinstallMissingPackages(context.missingPackages);
  messages.push(...reinstallResult.messages);

  return messages;
}

let availablePackages = readAvailablePackages();
let missingPackages = (config.requiredPackages ?? []).filter((pkg) => !availablePackages[pkg]);

if (fixMode) {
  log("🔧 Auto-fix mode enabled");
  const fixMessages = applyAutoFixes({ missingPackages });
  fixMessages.forEach((line) => log(line));
  availablePackages = readAvailablePackages();
  missingPackages = (config.requiredPackages ?? []).filter((pkg) => !availablePackages[pkg]);
}

if (missingPackages.length > 0) {
  success = false;
  log(`❌ Missing required packages: ${missingPackages.join(", ")}`);
} else {
  log("✅ All required packages present");
}

const envChecks = config.envChecks ?? [];
const missingEnv = envChecks.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  log(`⚠️ Missing environment variables: ${missingEnv.join(", ")}`);
} else if (envChecks.length) {
  log("✅ Environment variables detected");
}

const auditCommands = [
  { label: "Duplicate route scan", command: "node scripts/scan-dupes.mjs" },
  { label: "S3 health check", command: "node scripts/s3HealthCheck.js" },
  { label: "Document audit", command: "node scripts/audit-documents.js", optional: true },
];

for (const { label, command, optional } of auditCommands) {
  try {
    execSync(command, { stdio: "pipe" });
    log(`✅ ${label}`);
  } catch (error) {
    if (optional && /ENOENT/.test(error?.message ?? "")) {
      log(`⚠️ ${label} skipped (command not found)`);
      continue;
    }
    success = false;
    const stderr = error?.stderr?.toString() ?? "";
    const stdout = error?.stdout?.toString() ?? "";
    log(`❌ ${label}`);
    if (stdout) log(stdout.trim());
    if (stderr) log(stderr.trim());
  }
}

const finalMarker = success ? "codex-last-pass.txt" : "codex-last-fail.txt";
const finalPath = path.join(reportDir, finalMarker);
fs.writeFileSync(finalPath, logPath + "\n");

if (!success) {
  process.exitCode = 1;
}
