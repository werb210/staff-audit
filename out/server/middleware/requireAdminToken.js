export function requireAdminToken(req, res, next) {
    const expected = process.env.ADMIN_MUTATION_TOKEN;
    const got = String(req.headers["x-admin-token"] || "");
    if (!expected || got !== expected)
        return res.status(403).json({ ok: false, error: "admin_forbidden" });
    next();
}
