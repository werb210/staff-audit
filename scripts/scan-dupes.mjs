// node scripts/scan-dupes.mjs
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const mustBeUnique = [
  // security/CSP
  { label: "CSP header set", rg: "(Content-Security-Policy|setHeader\\(['\"]Content-Security-Policy|helmet\\.contentSecurityPolicy\\()", allowIn: ["server/middleware/csp.ts"] },

  // auth/session endpoints
  { label: "Auth session endpoint", rg: "/api/auth/session", allowIn: ["server/routes/auth.ts"] },

  // voice token endpoint (Twilio)
  { label: "Voice token endpoint", rg: "/api/twilio/token", allowIn: ["server/routes/twilio.ts"] },

  // router providers (React Router / Next router)
  { label: "React Router providers", rg: "<(BrowserRouter|HashRouter)", allowIn: ["client/src/app/Providers.tsx"] },

  // iframe sandbox flag that keeps showing up
  { label: "Invalid iframe sandbox flag", rg: "allow-downloads-without-user-activation", allowIn: [] },

  // legacy CSP tokens/errors that must not exist anywhere
  { label: "Bad CSP tokens", rg: "'unsafe-dynamic'|report-uri[^;]*;?\\s*[^:]", allowIn: [] },

  // any old security dir
  { label: "Legacy security dir", rg: "server/security/csp\\.ts|server/security/.*", allowIn: [] },
];

function rg(pattern) {
  try {
    // Try ripgrep first, fallback to grep
    let cmd;
    try {
      execSync('which rg', { stdio: 'ignore' });
      cmd = `rg -n --hidden -S --glob '!node_modules' --glob '!.next' --glob '!dist' --glob '!build' --glob '!scripts' '${pattern}' . || true`;
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

if (failed) {
  console.log("\n⛔ De-dupe scan FAILED. Remove the items above or move them into the canonical file(s).\n");
  process.exit(1);
} else {
  console.log("\n✅ De-dupe scan clean. No duplicates outside canonical locations.\n");
}