import assert from "assert";

/**
 * SecretsGuard checks environment variables at runtime and throws
 * if required secrets are missing or mismatched.
 */
export function checkSecrets() {
  const required = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_API_KEY_SID",
    "TWILIO_API_KEY_SECRET",
    "TWILIO_VERIFY_SERVICE_SID",
    "DATABASE_URL"
  ];

  const missing: string[] = [];
  for (const key of required) {
    const val = process.env[key];
    if (!val) {
      console.error(`[FATAL] Missing secret: ${key}`);
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(`[FATAL] Missing ${missing.length} required secrets: ${missing.join(", ")}`);
    console.error(`[FATAL] Set these in Replit Secrets and restart`);
    throw new Error(`Missing required secrets: ${missing.join(", ")}`);
  }

  // Example guard: Twilio account sanity check
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  if (!sid.startsWith("AC")) {
    throw new Error(`[FATAL] TWILIO_ACCOUNT_SID invalid: ${sid}`);
  }

  console.log("✅ SecretsGuard passed. All required secrets present.");
}
