// STANDARDIZED LOGIN HANDLER
// Implements user's exact specification for cookie + Bearer token authentication
import { signAuthToken } from '../utils/jwt';
function cookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    const ui = process.env.UI_ORIGIN || '';
    const api = process.env.API_ORIGIN || '';
    const crossSite = ui && api && !ui.startsWith(api);
    const opts = {
        httpOnly: true,
        secure: isProd, // must be true on HTTPS
        path: '/',
        sameSite: crossSite ? 'none' : 'lax',
    };
    if (crossSite && process.env.COOKIE_DOMAIN)
        opts.domain = process.env.COOKIE_DOMAIN;
    return opts;
}
export async function loginHandler(req, res, user) {
    // Generate standardized JWT with userId field
    const token = signAuthToken({ userId: user.id, role: user.role, email: user.email });
    // Set standardized cookie
    res.cookie('bf_auth', token, cookieOptions());
    // Return standardized response with bearer token
    return res.json({
        ok: true,
        bearer: token,
        user: {
            id: user.id,
            role: user.role,
            email: user.email
        }
    });
}
