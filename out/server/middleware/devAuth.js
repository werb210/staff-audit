import jwt from "jsonwebtoken";
export function devAuth(req, _res, next) {
    if (process.env.DEV_AUTH !== "1")
        return next();
    // Base dev user if none exists yet
    let user = req.user ?? {
        id: "dev-user",
        email: "staff@boreal.financial",
        role: "admin",
        dev: true
    };
    // Accept bearer/jwt if present (helps local API tests)
    const bearer = req.get("authorization")?.replace(/^Bearer\s+/i, "");
    const cookieTok = req.cookies?.staff_token;
    const token = bearer || cookieTok;
    if (token) {
        try {
            const payload = jwt.decode(token);
            user = {
                id: payload?.sub ?? user.id,
                email: payload?.email ?? user.email,
                role: payload?.role ?? user.role,
                dev: true
            };
        }
        catch { /* ignore */ }
    }
    // DEV override: cookie with impersonation payload
    const imp = req.cookies?.dev_impersonate;
    if (imp) {
        try {
            const data = JSON.parse(imp); // { role, email?, lenderId? }
            if (data?.role)
                user.role = data.role;
            if (data?.email)
                user.email = data.email;
            if (data?.lenderId)
                user.lenderId = data.lenderId;
            user.dev = true;
        }
        catch { /* ignore */ }
    }
    // Header override (useful for quick cURL): x-dev-role
    const hdrRole = req.get("x-dev-role");
    if (hdrRole)
        user.role = hdrRole;
    req.user = user;
    next();
}
