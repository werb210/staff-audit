import jwt from "jsonwebtoken";
export function requireAuth(req, res, next) {
    // PRODUCTION FIX: Check for client API bypass flag
    if (req.skipAuth || req.bypassAllAuth ||
        req.path.startsWith("/api/verify/") || req.path === "/api/health" ||
        req.path.startsWith("/api/public/") || req.path.startsWith("/api/client/") ||
        req.path === "/api/objects/sign") {
        console.log(`🔓 [REQUIRE-AUTH-BYPASS] Bypassing auth for: ${req.path}`);
        return next();
    }
    const h = req.headers["authorization"];
    if (!h || !h.startsWith("Bearer "))
        return res.status(401).json({ error: "missing token" });
    try {
        const token = h.slice("Bearer ".length);
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        return next();
    }
    catch (e) {
        return res.status(401).json({ error: "invalid token", detail: String(e) });
    }
}
