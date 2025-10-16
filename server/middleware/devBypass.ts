import type { Application, Request, Response, NextFunction } from 'express';
export function installDevAuthBypass(app: Application) {
  const on = process.env.SECURITY_PROFILE === 'off' || process.env.NODE_ENV !== 'production';
  console.log(`🔓 [DEV-BYPASS] Security profile: ${process.env.SECURITY_PROFILE}, NODE_ENV: ${process.env.NODE_ENV}, Bypass active: ${on}`);
  
  if (!on) return;
  
  // Override any existing auth session routes with dev bypass
  app.get('/api/auth/session', (_req: Request, res: Response) => {
    console.log('✅ [DEV-BYPASS] Returning dev admin session');
    res.json({ ok: true, user: { id: 'dev-admin', role: 'Admin', name: 'Dev Admin' } });
  });
  
  // Ensure all requests have a dev user attached
  app.use((req: any, _res: Response, next: NextFunction) => { 
    req.user ||= { id: 'dev-admin', role: 'Admin' }; 
    next(); 
  });
}