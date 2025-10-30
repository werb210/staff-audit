// Read-only endpoints that can be accessed without authentication in preview
const readOnlyBypass = [
    /^\/api\/pipeline\/board$/,
    /^\/api\/pipeline\/cards\/[^/]+\/application$/,
    /^\/api\/pipeline\/cards\/[^/]+\/documents$/,
    /^\/api\/voice\/token$/, // token itself checks silo + signs JWT
    /^\/api\/auth\/ws-token$/,
    /^\/api\/contacts$/, // for contact listings
    /^\/api\/dashboard\/\w+$/, // dashboard stats
    /^\/api\/_int\/build$/ // build info for HMR and monitoring
];
export function authOrBypass(req, res, next) {
    // Bypass auth for read-only GET requests in preview
    if (req.method === "GET" && readOnlyBypass.some(rx => rx.test(req.path))) {
        return next();
    }
    // For other requests, would normally require auth
    // For now, continue without auth check in dev mode
    if (process.env.NODE_ENV === 'development') {
        return next();
    }
    // In production, implement proper auth check here
    return next();
}
export default authOrBypass;
