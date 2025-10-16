import type { Application, Request, Response, NextFunction } from 'express';
import express from 'express';

export function configureSecurity(app: Application) {
  const profile = (process.env.SECURITY_PROFILE || 'off').toLowerCase();
  console.log('🔓 [SECURITY] Configuring profile:', profile);
  
  if (profile === 'off') {
    try { 
      const cors = require('cors'); 
      app.use(cors({ origin: true, credentials: true })); 
    } catch {}
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Security-Profile', 'off');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      if (req.method === 'OPTIONS') return res.status(204).end();
      next();
    });
  }
  const r = express.Router();
  r.get('/_int/security-profile', (_req: Request, res: Response) =>
    res.json({ profile, nodeEnv: process.env.NODE_ENV || 'dev', ts: Date.now() })
  );
  app.use('/api', r);
  return profile;
}