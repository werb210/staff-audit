// Fail fast if the Twilio account is not one of the explicitly allowed accounts.
// Set TWILIO_ALLOWED_ACCOUNTS to a comma-separated list of SIDs you approve.
(function guard() {
  const sid = process.env.TWILIO_ACCOUNT_SID || "";
  const env = process.env.NODE_ENV || "development";
  const allowedRaw = process.env.TWILIO_ALLOWED_ACCOUNTS || "";
  const allowed = allowedRaw.split(",").map(s => s.trim()).filter(Boolean);

  // If no SID is configured, nothing to enforce.
  if (!sid) {
    console.warn("[TwilioGuard] TWILIO_ACCOUNT_SID not set. Twilio features will likely fail.");
    return;
  }

  // In production, an allowlist is mandatory.
  if (env === "production" && allowed.length === 0) {
    throw new Error("[TwilioGuard] In production you must set TWILIO_ALLOWED_ACCOUNTS to the approved SID(s).");
  }

  // If allowlist exists, enforce membership.
  if (allowed.length > 0 && !allowed.includes(sid)) {
    throw new Error(
      `[TwilioGuard] TWILIO_ACCOUNT_SID ${sid.slice(0, 8)}… is NOT in TWILIO_ALLOWED_ACCOUNTS. Refusing to start.`
    );
  }

  // Optional Verify service sanity check.
  const verify = process.env.TWILIO_VERIFY_SERVICE_SID || "";
  if (!verify) {
    console.warn("[TwilioGuard] TWILIO_VERIFY_SERVICE_SID not set. Verify flows will be unavailable.");
  }

  console.log(`[TwilioGuard] OK. Using SID ${sid.slice(0, 8)}… (${env}).`);
})();
export {};
