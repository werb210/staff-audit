import { AUTH_SESSION_ENDPOINT } from '../../shared/apiRoutes';
export function installDevAuthBypass(app) {
    const on = process.env.SECURITY_PROFILE === 'off' || process.env.NODE_ENV !== 'production';
    console.log(`🔓 [DEV-BYPASS] Security profile: ${process.env.SECURITY_PROFILE}, NODE_ENV: ${process.env.NODE_ENV}, Bypass active: ${on}`);
    if (!on)
        return;
    // Override any existing auth session routes with dev bypass
    app.get(AUTH_SESSION_ENDPOINT, (_req, res) => {
        console.log('✅ [DEV-BYPASS] Returning dev admin session');
        res.json({ ok: true, user: { id: 'dev-admin', role: 'Admin', name: 'Dev Admin' } });
    });
    // Ensure all requests have a dev user attached
    app.use((req, _res, next) => {
        req.user ||= { id: 'dev-admin', role: 'Admin' };
        next();
    });
}
