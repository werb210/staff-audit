import crypto from "crypto";
const SECRET = process.env.HASH_SECRET || "dev-secret";
function sign(payload) { return crypto.createHmac("sha256", SECRET).update(payload).digest("hex"); }
export function setImpersonationCookie(res, imp) {
    const json = JSON.stringify(imp);
    const sig = sign(json);
    res.cookie("impersonate", Buffer.from(json).toString("base64") + "." + sig, {
        httpOnly: true, sameSite: "lax", secure: !!process.env.COOKIE_SECURE, path: "/",
        maxAge: 60 * 60 * 1000 // 1 hour
    });
}
export function clearImpersonationCookie(res) {
    res.clearCookie("impersonate", { path: "/" });
}
export function readImpersonationCookie(req) {
    const raw = req.cookies?.impersonate;
    if (!raw)
        return null;
    const [b64, sig] = String(raw).split(".");
    if (!b64 || !sig)
        return null;
    const json = Buffer.from(b64, "base64").toString("utf8");
    if (sign(json) !== sig)
        return null; // tamper check
    try {
        const imp = JSON.parse(json);
        // expire after 1h
        if (Date.now() - (imp.startedAt || 0) > 60 * 60 * 1000)
            return null;
        return imp;
    }
    catch {
        return null;
    }
}
/** Middleware: attach effective role if impersonating */
export function applyImpersonation(req, _res, next) {
    const user = req.user;
    if (!user)
        return next();
    const imp = readImpersonationCookie(req);
    if (imp) {
        req.auth = {
            real: { id: user.id, email: user.email, role: user.role },
            effective: { role: imp.role, lenderId: imp.lenderId, asUserId: imp.asUserId }
        };
        // Preserve original, but expose effective role to RBAC
        user.roleEffective = imp.role;
        if (imp.lenderId)
            user.lenderId = imp.lenderId;
    }
    else {
        req.auth = { real: { id: user.id, email: user.email, role: user.role } };
        user.roleEffective = user.role;
    }
    next();
}
