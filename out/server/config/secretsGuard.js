// Lightweight runtime audit of required and optional secrets.
// Exported function is called from server/index.ts on boot.
const REQUIRED = [
    { key: "SESSION_SECRET", required: true, hint: "random 32+ chars" },
    { key: "DATABASE_URL", required: true, hint: "postgres connection string" },
];
const OPTIONAL = [
    // JWT
    { key: "JWT_SECRET", hint: "sign tokens for /api auth" },
    // Microsoft 365
    { key: "O365_CLIENT_ID" },
    { key: "O365_CLIENT_SECRET", mask: true },
    { key: "O365_TENANT_ID" },
    { key: "O365_REDIRECT_URI" },
    // Twilio
    { key: "TWILIO_ACCOUNT_SID" },
    { key: "TWILIO_AUTH_TOKEN", mask: true },
    { key: "TWILIO_API_KEY_SID" },
    { key: "TWILIO_API_KEY_SECRET", mask: true },
    { key: "TWILIO_TWIML_APP_SID" },
    { key: "TWILIO_VERIFY_SERVICE_SID" },
    // Misc
    { key: "ALLOW_ORIGINS" },
    { key: "API_DIAG" },
];
function fmt(key, v, mask = false) {
    if (!v)
        return `${key}=<MISSING>`;
    if (mask)
        return `${key}=${v.slice(0, 4)}…`;
    return `${key}=${v.slice(0, 8)}…`;
}
export function checkSecrets() {
    const errs = [];
    const notes = [];
    for (const c of REQUIRED) {
        const v = process.env[c.key];
        if (!v) {
            errs.push(`❌ ${c.key} missing${c.hint ? ` (${c.hint})` : ""}`);
        }
        else {
            notes.push(`✅ ${fmt(c.key, v, c.mask)}`);
        }
    }
    for (const c of OPTIONAL) {
        const v = process.env[c.key];
        if (!v) {
            notes.push(`⚠️  ${c.key} not set${c.hint ? ` (${c.hint})` : ""}`);
        }
        else {
            notes.push(`✅ ${fmt(c.key, v, c.mask)}`);
        }
    }
    // O365 partial config warning
    const o365Keys = ["O365_CLIENT_ID", "O365_CLIENT_SECRET", "O365_TENANT_ID", "O365_REDIRECT_URI"];
    const haveO365 = o365Keys.filter(k => !!process.env[k]).length;
    if (haveO365 > 0 && haveO365 < o365Keys.length) {
        notes.push("⚠️  O365 config is partial. Connect flow will fail until all are set.");
    }
    // Twilio partial config warning
    const twilioKeys = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"];
    const haveTw = twilioKeys.filter(k => !!process.env[k]).length;
    if (haveTw > 0 && haveTw < twilioKeys.length) {
        notes.push("⚠️  Twilio config is partial. Some Twilio features will fail.");
    }
    // Print summary
    console.log("🔐 [SecretsGuard] Summary:");
    for (const n of notes)
        console.log("   ", n);
    if (errs.length) {
        const detail = errs.join("\n   ");
        // Do not crash. Caller’s try/catch in server/index.ts logs and continues.
        const e = new Error(`Missing required secrets:\n   ${detail}`);
        // Still log loudly.
        console.error("🔐 [SecretsGuard] Errors:\n   " + detail);
        throw e;
    }
}
