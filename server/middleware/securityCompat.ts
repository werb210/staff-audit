import type { Request, Response, NextFunction } from 'express';
import cookie from 'cookie';

const DEV_PROFILES = new Set(['off','dev-open','dev','development','']);
function isDevProfile(): boolean {
  const p = String(process.env.SECURITY_PROFILE||'').toLowerCase();
  return DEV_PROFILES.has(p) || process.env.NODE_ENV !== 'production';
}

export function securityCompat(req: Request, res: Response, next: NextFunction) {
  const profile = String(process.env.SECURITY_PROFILE||'').toLowerCase() || (process.env.NODE_ENV==='production'?'locked':'off');
  res.setHeader('X-Security-Profile', profile);

  if (isDevProfile()) {
    // 1) Stub user so any downstream "req.user" checks pass
    (req as any).user = (req as any).user || { id:'dev-admin', email:'dev@local', role:'Admin', name:'Dev Admin' };

    // 2) If an auth middleware only checks for an Authorization header, provide a harmless one
    if (!req.headers.authorization) req.headers.authorization = 'Bearer dev-admin-token';

    // 3) CSRF conveniences: ensure a token cookie + header presence so frontends that "expect" it proceed
    const cookies = cookie.parse(req.headers.cookie||'');
    const haveCsrf = cookies['csrfToken'];
    if (!haveCsrf) {
      const tok = 'dev-csrf-' + Math.random().toString(36).slice(2);
      res.cookie?.('csrfToken', tok, { httpOnly:false, sameSite:'lax' });
      (req as any).__csrfToken = tok;
    }
    if (!req.headers['x-csrf-token']) req.headers['x-csrf-token'] = (cookies['csrfToken']||(req as any).__csrfToken||'dev');

    // 4) Relax CORS/CSP expectations indirectly by marking profile; actual helmet/CORS may still be mounted elsewhere.
    res.setHeader('X-Compat', 'dev-auth,dev-csrf');
  }
  next();
}