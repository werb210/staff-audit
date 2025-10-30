import { requireAuth } from "../mw/auth-required.js";
// Protect BOTH `/staff` and `/.replit.dev/staff` paths (Replit preview iframe)
const PROTECTED = [/\/staff(?:\/|$)/, /\/\.replit\.dev\/staff(?:\/|$)/];
export function iframeStaffGuard(req, res, next) {
    const url = req.originalUrl || req.url || "";
    if (PROTECTED.some(rx => rx.test(url))) {
        return requireAuth(req, res, next);
    }
    return next();
}
