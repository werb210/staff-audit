export function requireLenderAuth(req, res, next) {
    // TODO integrate with real lender auth. Minimal guard supports path scoping:
    const sessionLenderId = req.headers["x-lender-id"]; // replace with real session in prod
    if (!sessionLenderId)
        return res.status(401).json({ ok: false, error: "lender_auth_required" });
    if (req.params.lenderId && req.params.lenderId !== String(sessionLenderId)) {
        return res.status(403).json({ ok: false, error: "lender_forbidden" });
    }
    next();
}
