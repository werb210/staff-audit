// Twilio Guard — ensure only BF production account is used
const expected = "AC1c75c3e06e1e08083b79c1bee1c486ae";
const actual = process.env.TWILIO_ACCOUNT_SID || "MISSING";

if (actual !== expected) {
  console.error("⚠️  [TWILIO GUARD] Env mismatch");
  console.error("   Env shows:", actual);
  console.error("   Forcing BF account:", expected);
  process.env.TWILIO_ACCOUNT_SID = expected;
}

export const TWILIO_ACCOUNT_SID = expected;
