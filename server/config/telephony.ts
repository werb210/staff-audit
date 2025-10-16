// BF-only telephony configuration
// HARD-CODED: Forcing correct BF account until Replit env var cache clears
const FORCE_BF_ACCOUNT = "AC1c75c3e06e1e08083b79c1bee1c486ae";

export const TELEPHONY = {
  BF: {
    phoneNumber: "+18254511768", // Boreal Financial dedicated number
    accountSid: FORCE_BF_ACCOUNT, // Hard-coded to bypass Replit cache
    apiKeySid: process.env.TWILIO_API_KEY_SID!,
    apiKeySecret: process.env.TWILIO_API_KEY_SECRET!,
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID!,
    twimlAppSid: process.env.TWILIO_TWIML_APP_SID!,
  },
};
