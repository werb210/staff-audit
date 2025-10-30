import { Router } from "express";
import twilio from "twilio";
import jwt from "jsonwebtoken";
const router = Router();
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID, BF_SMS_FROM_E164, BF_WHATSAPP_FROM, ENVIRONMENT = "production", ALLOW_OTP_DIAG, } = process.env;
const MOCK_ACCOUNT_SID = 'ACmock000000000000000000000000000';
const MOCK_AUTH_TOKEN = 'mock_auth_token';
const accountSid = TWILIO_ACCOUNT_SID || MOCK_ACCOUNT_SID;
const authToken = TWILIO_AUTH_TOKEN || MOCK_AUTH_TOKEN;
const client = (accountSid.startsWith('AC') && authToken !== MOCK_AUTH_TOKEN)
    ? twilio(accountSid, authToken)
    : null;
const isProd = ENVIRONMENT === "production";
const allow = ALLOW_OTP_DIAG === "true";
function requireDiag(req, res, next) {
    if (!allow)
        return res.status(403).json({ ok: false, error: "diag disabled" });
    // Check for JWT token in cookie or bearer header (same logic as auth router)
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required');
    }
    const COOKIE_NAME = 'bf_auth';
    const fromCookie = req.cookies?.[COOKIE_NAME];
    const auth = req.header('authorization') || req.header('Authorization');
    const fromBearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    const token = fromCookie || fromBearer;
    if (!token)
        return res.status(403).json({ ok: false, error: "auth required - no token" });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Set the user in req for use by endpoints - ensure phone is available
        req.auth = { user: { ...decoded, phone: decoded.phone || "+12345678901" } };
        next();
    }
    catch (e) {
        return res.status(403).json({ ok: false, error: "auth required - invalid token" });
    }
}
function assertE164(p) {
    if (!/^\+?[1-9]\d{1,14}$/.test(p))
        throw new Error("Invalid E.164 phone");
}
function mask(p) {
    return p.replace(/^(\+\d)(\d{3})(\d+)(\d{2})$/, (_m, a, b, mid, d2) => `${a}${b}-***-${d2}`);
}
// GET /api/otp/diag/health  (no send)
router.get("/health", requireDiag, async (req, res) => {
    try {
        const user = req.auth?.user;
        const to = String(user?.phone || "");
        const health = {
            env: { ENVIRONMENT, TWILIO_VERIFY_SET: !!TWILIO_VERIFY_SERVICE_SID, BF_SMS_FROM_SET: !!BF_SMS_FROM_E164, BF_WHATSAPP_FROM_SET: !!BF_WHATSAPP_FROM },
            user: { id: user?.id, phoneMasked: to ? mask(to) : null },
            account: {},
            lookup: {},
            likelyProblem: null
        };
        if (!to) {
            health.likelyProblem = "missing_user_phone";
            return res.json({ ok: false, health, message: "User phone missing" });
        }
        assertE164(to);
        // Account info
        const acct = await client.api.v2010.accounts(TWILIO_ACCOUNT_SID).fetch();
        health.account = { status: acct.status, type: acct.type || "unknown" }; // status: active|suspended; type may be 'Trial' in Console UI
        // Lookup
        try {
            const l = await client.lookups.v2.phoneNumbers(to).fetch({ fields: "line_type_intelligence,carrier" });
            const line = l?.lineTypeIntelligence?.type || "unknown";
            const smsCapable = ["mobile", "fixedVoip", "voip"].includes(String(line).toLowerCase());
            health.lookup = {
                nationalFormat: l.nationalFormat, countryCode: l.countryCode,
                lineType: line, carrier: l?.carrier?.name || null,
                smsCapable
            };
            if (!smsCapable)
                health.likelyProblem = "not_sms_capable_try_whatsapp";
        }
        catch (e) {
            health.lookup = { error: e?.message };
        }
        if (!TWILIO_VERIFY_SERVICE_SID) {
            health.likelyProblem = "missing_verify_service";
        }
        if (!BF_SMS_FROM_E164) {
            health.likelyProblem ||= "missing_bf_sender";
        }
        res.json({ ok: true, health });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: e?.message || "diag failed" });
    }
});
// POST /api/otp/diag/send  (real Verify: SMS then WA fallback)
router.post("/send", requireDiag, async (req, res) => {
    try {
        const user = req.auth?.user;
        if (!user?.phone)
            return res.status(400).json({ ok: false, error: "User phone missing" });
        if (!TWILIO_VERIFY_SERVICE_SID)
            return res.status(500).json({ ok: false, error: "Verify service not configured" });
        const to = String(user.phone);
        assertE164(to);
        const output = { toMasked: mask(to), attempts: [] };
        // Lookup gate
        let smsCapable = true;
        try {
            const l = await client.lookups.v2.phoneNumbers(to).fetch({ fields: "line_type_intelligence" });
            const line = l?.lineTypeIntelligence?.type || "unknown";
            smsCapable = ["mobile", "fixedVoip", "voip"].includes(String(line).toLowerCase());
            output.lookup = { lineType: line, smsCapable };
        }
        catch (e) {
            output.lookup = { error: e?.message };
        }
        // Try SMS
        if (smsCapable) {
            try {
                const sms = await client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID).verifications.create({ to, channel: "sms" });
                output.attempts.push({ channel: "sms", sid: sms.sid, status: sms.status });
                return res.json({ ok: true, via: "sms", ...output });
            }
            catch (e) {
                output.attempts.push({ channel: "sms", error: e?.message });
            }
        }
        // Fallback to WhatsApp
        try {
            const wa = await client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID).verifications.create({ to: `whatsapp:${to}`, channel: "whatsapp" });
            output.attempts.push({ channel: "whatsapp", sid: wa.sid, status: wa.status });
            return res.json({ ok: true, via: "whatsapp", ...output });
        }
        catch (e) {
            output.attempts.push({ channel: "whatsapp", error: e?.message });
            return res.status(502).json({ ok: false, message: "Both SMS and WhatsApp failed", ...output });
        }
    }
    catch (e) {
        res.status(500).json({ ok: false, error: e?.message || "send failed" });
    }
});
// GET /api/otp/diag/last  (list our last Message logs for visibility; Verify sends won't appear here)
router.get("/last", requireDiag, async (req, res) => {
    try {
        const mins = Math.max(1, Math.min(60, Number(req.query.mins) || 10));
        const to = req.auth?.user?.phone;
        if (!to)
            return res.status(400).json({ ok: false, error: "User phone missing" });
        assertE164(to);
        const d = new Date(Date.now() - mins * 60 * 1000).toISOString();
        // This fetches Programmable SMS logs; Verify sends are separate.
        const msgs = await client.messages.list({ to, dateSentAfter: new Date(d), limit: 20 });
        res.json({ ok: true, toMasked: mask(to), minutes: mins, count: msgs.length, msgs: msgs.map(m => ({ sid: m.sid, status: m.status, errorCode: m.errorCode })) });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: e?.message || "list failed" });
    }
});
export default router;
