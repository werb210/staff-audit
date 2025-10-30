export function csp(req, res, next) {
    // CSP is now set in server/index.ts - avoiding duplicate headers
    // res.setHeader("Content-Security-Policy", buildCsp());
    // res.setHeader("Permissions-Policy", permissionsPolicy);
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
}
