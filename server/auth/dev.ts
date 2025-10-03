import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export function mountDevAuth(app: any) {
  if (process.env.NODE_ENV === 'production') return;
  app.post('/api/auth/dev-token', (req: Request, res: Response) => {
    // Use actual JWT secret from environment
    const secret = process.env.JWT_SECRET || process.env.JWT_SECRET_BOREAL_FINANCIAL_PROD_2024_ae2dd3089a06aa32157abd1b997a392836059ba3d47dca79cff0660c09f95042 || 'dev-secret';
    const token = jwt.sign(
      { sub: 'dev-admin', roles: ['admin','user','marketing'] },
      secret,
      { expiresIn: '12h' }
    );
    res.json({ ok: true, token });
  });
}