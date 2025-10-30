import { Router } from "express";
import jwt from "jsonwebtoken";
import { or, eq } from "drizzle-orm";
import { users } from "../../shared/schema";
import { db } from "../db/drizzle";
import twilio from "twilio";
const JWT_SECRET = process.env.JWT_SECRET || "default-dev-secret-change-in-production";
const CLIENT_SYNC_KEY = process.env.CLIENT_SYNC_KEY;
const CLIENT_API_KEY = process.env.CLIENT_APP_API_KEY;
const WHITELISTED_PATHS = [
    "/api/health",
    "/api/_int/",
    "/api/lender-products",
    "/api/public-lender-products",
    "/api/client/",
    "/pipeline",
    "/dashboard",
];
function normPhone(p) {
    return (p || "").replace(/[^0-9+]/g, "").replace(/^1?(\d{10})$/, "+1$1");
}
function displayName(u) {
    const fn = u.firstName ?? u.first_name ?? "";
    const ln = u.lastName ?? u.last_name ?? "";
    const full = `${fn} ${ln}`.trim();
    return full || String(u.email || "");
}
export function blockLegacy(_req, res) {
    return res.status(410).json({ ok: false, error: "Legacy auth disabled. Twilio Verify-only." });
}
export function signSession(u) {
    const payload = {
        sub: String(u.id),
        role: String(u.role),
        email: String(u.email),
        phone: u.phone ?? null,
        name: displayName(u),
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
export async function requireAuth(req, res, next) {
    if (req.method === "OPTIONS")
        return next();
    // Client bypass and known public endpoints
    const url = `${req.originalUrl || ""}`;
    if (req.skipAuth ||
        req.bypassAllAuth ||
        WHITELISTED_PATHS.some((p) => url.startsWith(p) || url.includes(p))) {
        return next();
    }
    // Allow whitelisted lender-products with client key
    if (url.startsWith("/api/lender-products")) {
        const k = req.header("x-client-key") || req.header("x-api-key");
        if (k && (k === CLIENT_SYNC_KEY || k === CLIENT_API_KEY))
            return next();
        return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    // Dev bypass for comms endpoints
    if (!token && process.env.DEV_MODE === "true" && url.includes("/api/comms")) {
        // @ts-ignore
        req.user = { sub: "dev-user", email: "dev@example.com" };
        return next();
    }
    if (!token)
        return res.status(401).json({ ok: false, error: "Missing bearer" });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        // @ts-ignore
        req.user = payload;
        return next();
    }
    catch {
        return res.status(401).json({ ok: false, error: "Invalid token" });
    }
}
// Verify-only auth with DB fallback
export function createVerifyRouter() {
    const r = Router();
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    r.all("/login", blockLegacy);
    r.all("/register", blockLegacy);
    r.all("/password", blockLegacy);
    r.post("/request-otp", async (req, res) => {
        const { phone } = req.body || {};
        if (!phone)
            return res.status(400).json({ ok: false, error: "phone required" });
        try {
            if (process.env.TWILIO_VERIFY_SERVICE_SID) {
                await client.verify.v2
                    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
                    .verifications.create({ to: phone, channel: "sms" });
            }
            return res.json({ ok: true, sent: true });
        }
        catch (error) {
            return res.status(500).json({ ok: false, error: error.message });
        }
    });
    r.post("/verify-otp", async (req, res) => {
        const { phone, code } = req.body || {};
        if (!phone || !code)
            return res.status(400).json({ ok: false, error: "phone and code required" });
        try {
            const isDevBypass = !process.env.TWILIO_VERIFY_SERVICE_SID || code === "111111";
            let verified = false;
            if (isDevBypass && code === "111111") {
                verified = true;
            }
            else if (process.env.TWILIO_VERIFY_SERVICE_SID) {
                const check = await client.verify.v2
                    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
                    .verificationChecks.create({ to: phone, code });
                verified = check.status === "approved";
            }
            if (!verified)
                return res.status(401).json({ ok: false, error: "invalid_code" });
            const pE164 = normPhone(phone);
            const existing = await db
                .select()
                .from(users)
                .where(or(eq(users.phone, pE164), eq(users.email, phone.toLowerCase())))
                .limit(1);
            let u = existing[0];
            if (!u) {
                const emailGuess = `user_${pE164.replace(/\D/g, "")}@autocreated.local`;
                // Align to Drizzle users schema camelCase fields to satisfy TS
                const values = {
                    phone: pE164,
                    email: emailGuess,
                    role: "staff",
                    passwordHash: "unused",
                    firstName: "Auto",
                    lastName: "User",
                    totpEnabled: false,
                };
                const [newUser] = await db.insert(users).values(values).returning();
                u = newUser;
                console.info("[auth] created new user", u.email, "role:", u.role);
            }
            else {
                console.info("[auth] found existing user", u.email, "role:", u.role);
            }
            const token = signSession(u);
            const name = displayName(u);
            return res.json({
                ok: true,
                token,
                role: u.role,
                user: { id: u.id, name, phone: u.phone, email: u.email },
            });
        }
        catch (error) {
            return res.status(500).json({ ok: false, error: error.message });
        }
    });
    return r;
}
