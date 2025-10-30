import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret";
function readToken(req) {
    // 1) Authorization: Bearer <token>
    const h = req.headers["authorization"];
    if (h && /^Bearer\s+/.test(h))
        return String(h).replace(/^Bearer\s+/i, "");
    // 2) Cookie: auth_token=<jwt>
    const raw = req.headers.cookie || "";
    const m = raw.match(/(?:^|;\s*)auth_token=([^;]+)/);
    if (m)
        return decodeURIComponent(m[1]);
    // 3) X-Session-Token (fallback for older frontend)
    const x = req.headers["x-session-token"];
    if (x)
        return String(x);
    return null;
}
export function requireAuth(req, res, next) {
    const token = readToken(req);
    if (!token)
        return res.status(401).json({ ok: false, error: "missing_token" });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = { id: payload.sub || payload.id, phone: payload.phone, email: payload.email, roles: payload.roles || ["user"] };
        return next();
    }
    catch {
        return res.status(401).json({ ok: false, error: "invalid_token" });
    }
}
export function requireRole(...needed) {
    return (req, res, next) => {
        const roles = req.user?.roles || [];
        if (needed.length === 0 || roles.some(r => needed.includes(r)))
            return next();
        return res.status(403).json({ ok: false, error: "forbidden" });
    };
}
