const acct = process.env.TWILIO_ACCOUNT_SID;
const auth = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.BF_SMS_FROM_E164 || process.env.TWILIO_FROM_E164;
let twilioClient = null;
try {
    if (acct && auth)
        twilioClient = require("twilio")(acct, auth);
}
catch { }
export async function sendStageSms(to, template, vars = {}) {
    const body = template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
    if (twilioClient && from) {
        try {
            await twilioClient.messages.create({ to, from, body });
            return { ok: true };
        }
        catch (e) {
            console.warn("[sms] twilio send failed:", e?.message || e);
            return { ok: false, error: String(e?.message || e) };
        }
    }
    console.log("[sms] (dry-run) to=%s body=%s", to, body);
    return { ok: true, dryRun: true };
}
export function wantsSms(req) {
    // Feature flag or per-request toggle
    const f = process.env.ENABLE_STAGE_SMS || "";
    const q = (req.query.sms ?? "").toString();
    return f === "1" || f.toLowerCase() === "true" || q === "1" || q === "true";
}
// AI Ads Copilot SMS helper
export async function sendSMS(to, body) {
    if (!to || !/^\+\d{10,15}$/.test(to))
        throw new Error("invalid_msisdn");
    if (twilioClient && from) {
        return twilioClient.messages.create({ to, from, body });
    }
    console.log("[sms] (dry-run) to=%s body=%s", to, body);
    return { ok: true, dryRun: true };
}
