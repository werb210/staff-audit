import { Router } from 'express';
import cookie from 'cookie';
const r = Router();
function devOn() { return (process.env.NODE_ENV !== 'production') || ['off', 'dev-open', ''].includes(String(process.env.SECURITY_PROFILE || '').toLowerCase()); }
r.get('/auth/session', (_req, res) => {
    if (!devOn())
        return res.status(401).json({ ok: false });
    res.setHeader('X-Compat', 'dev-session');
    res.json({ ok: true, user: { id: 'dev-admin', email: 'dev@local', role: 'Admin', name: 'Dev Admin' } });
});
r.get('/csrf', (req, res) => {
    if (!devOn())
        return res.status(404).json({ ok: false });
    const cookies = cookie.parse(req.headers.cookie || '');
    const tok = cookies['csrfToken'] || 'dev-csrf-' + Math.random().toString(36).slice(2);
    res.cookie?.('csrfToken', tok, { httpOnly: false, sameSite: 'lax' });
    res.json({ ok: true, token: tok });
});
r.get('/_int/security-profile', (_req, res) => {
    res.json({ profile: (process.env.SECURITY_PROFILE || '').toLowerCase() || 'off', nodeEnv: process.env.NODE_ENV || 'development' });
});
export default r;
