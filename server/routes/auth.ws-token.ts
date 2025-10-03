import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Generate short-lived JWT for WebSocket authentication
router.get('/api/auth/ws-token', (req: any, res: any) => {
  try {
    // For now, create a basic token - enhance with proper user auth later
    const payload = {
      sub: req.user?.id || 'anonymous',
      silo: req.query.silo || 'BF',
      iat: Math.floor(Date.now() / 1000)
    };
    
    const secret = process.env.WS_JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret';
    const token = jwt.sign(payload, secret, { expiresIn: '10m' });
    
    res.json({ token });
  } catch (error: unknown) {
    console.error('WS token generation error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

export default router;