// node scripts/scan-dupes.mjs
import { existsSync, readdirSync } from "fs";
import { execSync } from "child_process";

const AUTH_SESSION_PATTERN = "/api/auth" + "/session";
const TWILIO_TOKEN_PATTERN = "/api/twilio" + "/token";

const mustBeUnique = [
  // security/CSP
  { label: "CSP header set", rg: "(Content-Security-Policy|setHeader\\(['\"]Content-Security-Policy|helmet\\.contentSecurityPolicy\\()", allowIn: ["server/middleware/csp.ts"] },

  // auth/session endpoints
  { label: "Auth session endpoint", rg: AUTH_SESSION_PATTERN, allowIn: ["server/routes/auth.ts", "shared/apiRoutes.ts"] },

  // voice token endpoint (Twilio)
  { label: "Voice token endpoint", rg: TWILIO_TOKEN_PATTERN, allowIn: ["server/routes/twilio.ts", "shared/apiRoutes.ts"] },

  // router providers (React Router / Next router)
  { label: "React Router providers", rg: "<(BrowserRouter|HashRouter)", allowIn: ["client/src/app/Providers.tsx"] },

  // iframe sandbox flag that keeps showing up
  { label: "Invalid iframe sandbox flag", rg: "allow-downloads-without-user-activation", allowIn: ["scripts/scan-dupes.mjs"] },

  // legacy CSP tokens/errors that must not exist anywhere
  { label: "Bad CSP tokens", rg: "'unsafe-dynamic'|report-uri[^;]*;?\\s*[^:]", allowIn: ["scripts/scan-dupes.mjs"] },
];

function rg(pattern) {
  try {
    // Try ripgrep first, fallback to grep
    let cmd;
    try {
      execSync("which rg", { stdio: "ignore" });
      const globs = [
        "--glob '!node_modules'",
        "--glob '!.next'",
        "--glob '!dist'",
        "--glob '!build'",
        "--glob '!reports'",
        "--glob '!reports/**'",
        "--glob '!tools/**'",
        "--glob '!**/*.txt'",
      ];
      const extensions = [
        "--iglob '*.ts'",
        "--iglob '*.tsx'",
        "--iglob '*.js'",
        "--iglob '*.jsx'",
        "--iglob '*.mjs'",
        "--iglob '*.cjs'",
      ];
      cmd = `rg -n --hidden -S ${[...globs, ...extensions].join(' ')} '${pattern}' . || true`;
    } catch {
      cmd = `grep -r -n '${pattern}' . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=scripts || true`;
    }
    return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
  } catch (e) {
    return "";
  }
}

let failed = false;
for (const rule of mustBeUnique) {
  const out = rg(rule.rg);
  if (!out) continue;

  const lines = out.split("\n").filter(Boolean);
  // Count hits that are NOT in the allowed file list
  const disallowed = lines.filter(line => {
    const file = line.split(":")[0];
    return !rule.allowIn.some(allow => file.endsWith(allow));
  });

  // If rule requires single canonical file, ensure no other files match
  if (disallowed.length) {
    failed = true;
    console.log(`\n❌ ${rule.label} — found outside canonical location(s):`);
    for (const l of disallowed) console.log("   " + l);
  }

  // If rule has canonical files, ensure they actually exist
  if (rule.allowIn.length) {
    for (const f of rule.allowIn) {
      if (!existsSync(f)) {
        failed = true;
        console.log(`\n❌ ${rule.label} — canonical file missing: ${f}`);
      }
    }
  }
}

const allowedSecurityFiles = new Set([
  "applySecurity.ts",
  "csp.ts",
  "impersonate.ts",
  "jwtOrSession.ts",
  "permissions.ts",
  "productionLogging.ts",
  "rateLimit.ts",
  "rbac.ts",
  "twilioVerify.ts",
]);

if (existsSync("server/security")) {
  const entries = readdirSync("server/security").filter((name) => !name.startsWith("."));
  const unexpected = entries.filter((name) => !allowedSecurityFiles.has(name));
  if (unexpected.length) {
    failed = true;
    console.log("\n❌ Legacy security dir — unexpected file(s) detected:");
    for (const file of unexpected) {
      console.log(`   server/security/${file}`);
    }
  }

  for (const file of allowedSecurityFiles) {
    if (!entries.includes(file)) {
      failed = true;
      console.log(`\n❌ Legacy security dir — canonical file missing: server/security/${file}`);
    }
  }
} else {
  failed = true;
  console.log("\n❌ Legacy security dir — directory server/security is missing");
}

if (failed) {
  console.log("\n⛔ De-dupe scan FAILED. Remove the items above or move them into the canonical file(s).\n");
  process.exit(1);
}

console.log("\n✅ De-dupe scan clean. No duplicates outside canonical locations.\n");
