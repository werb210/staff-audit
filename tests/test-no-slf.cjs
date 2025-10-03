#!/usr/bin/env node
const { execSync } = require("child_process");

function search(term) {
  try {
    return execSync(`rg -n "${term}" server/`, { encoding: "utf8" });
  } catch {
    return "";
  }
}

let failed = false;

// Check for forbidden SLF telephony/dialer references
const slfDialerHits = search("slf.*dialer|dialer.*slf");
const slfVerifyHits = search("slf.*verify|verify.*slf");
const slfTwilioHits = search("slf.*twilio|twilio.*slf");

if (slfDialerHits) {
  console.error("[FATAL] Found forbidden SLF dialer reference:\n", slfDialerHits);
  failed = true;
}

if (slfVerifyHits) {
  console.error("[FATAL] Found forbidden SLF verify reference:\n", slfVerifyHits);
  failed = true;
}

if (slfTwilioHits) {
  console.error("[FATAL] Found forbidden SLF Twilio reference:\n", slfTwilioHits);
  failed = true;
}

if (failed) {
  process.exit(1);
} else {
  console.log("[PASS] No SLF telephony references found in server/");
  console.log("✅ BF-only telephony verified");
}
