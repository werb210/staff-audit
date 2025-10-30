// BF-only telephony configuration
const FORCE_BF_ACCOUNT = "AC1c75c3e06e1e08083b79c1bee1c486ae";

export const TELEPHONY = {
  BF: {
    phoneNumber: "+18254511768", // Boreal Financial dedicated number
    apiKeySid: process.env.TWILIO_API_KEY_SID!,
    apiKeySecret: process.env.TWILIO_API_KEY_SECRET!,
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID!,
    twimlAppSid: process.env.TWILIO_TWIML_APP_SID!,
  },
};
