import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { attachUserIfPresent, requireJwt, signJwt, setAuthCookie } from "../mw/jwt-auth";
async function findUserByEmail(email) {
    try {
        const rows = await db.execute(sql `select id, email, role, password_hash, active from users where lower(email)=lower(${email}) limit 1`);
        const r = Array.isArray(rows) ? rows[0] : rows?.rows?.[0];
        return r || null;
    }
    catch (e) {
        // DB not available or schema mismatch; do not throw to keep login path deterministic
        return null;
    }
}
function normalizeUser(u) {
    return { id: String(u.id), email: u.email, role: u.role || "user" };
}
export function setupAuth(app) {
    const r = Router();
    // POST /api/auth/login
    r.post("/login", async (req, res) => {
        const { email, password } = req.body || {};
        if (!email || !password)
            return res.status(400).json({ ok: false, error: "missing_credentials" });
        // Primary path: lookup in DB
        const u = await findUserByEmail(String(email));
        if (u && (u.active ?? true) !== false && u.password_hash) {
            const ok = await bcrypt.compare(String(password), String(u.password_hash));
            if (!ok)
                return res.status(401).json({ ok: false, error: "bad_credentials" });
            const user = normalizeUser(u);
            const token = signJwt(user);
            setAuthCookie(res, token);
            return res.json({ ok: true, token, user });
        }
        // Fallback: env-based dev login (optional)
        const devEmail = process.env.DEV_LOGIN_EMAIL;
        const devPass = process.env.DEV_LOGIN_PASSWORD;
        if (process.env.DEV_LOGIN === "1" && devEmail && devPass && email === devEmail && password === devPass) {
            const user = { id: "dev-1", email: devEmail, role: "admin" };
            const token = signJwt(user);
            setAuthCookie(res, token);
            return res.json({ ok: true, token, user, note: "dev_login" });
        }
        return res.status(401).json({ ok: false, error: "bad_credentials_or_user_not_found" });
    });
    // GET session endpoint (mounted under /api/auth, idempotent; returns user if token present)
    r.get("/session", attachUserIfPresent, (req, res) => {
        return res.json({ ok: true, user: req.user || null });
    });
    // POST /api/auth/logout
    r.post("/logout", (_req, res) => {
        res.clearCookie("token");
        return res.json({ ok: true });
    });
    // GET /api/auth/_debug/jwt
    r.get("/_debug/jwt", requireJwt, (req, res) => {
        res.json({ ok: true, user: req.user });
    });
    app.use("/api/auth", r);
}
export default setupAuth;
