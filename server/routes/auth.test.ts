import { Router } from "express";
import jwt from "jsonwebtoken";

const r = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// Enhanced login that works in iframes with proper token/cookie handling
r.post('/test-login', async (req: any, res: any) => {
  try {
    const user = { 
      id: 'test-user-1', 
      email: 'test@example.com', 
      roles: ['admin', 'user', 'marketing'] 
    };
    
    const token = jwt.sign(
      { sub: user.id, roles: user.roles },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Cookie must be third-party friendly in iframes
    res.cookie("auth_token", token, {
      httpOnly: true,
      sameSite: "none",     // key for iframe compatibility
      secure: true,         // Replit preview is HTTPS
      path: "/",
    });

    // Also return for SPA header use
    res.json({ 
      ok: true, 
      token, 
      user: { id: user.id, roles: user.roles } 
    });
  } catch (error: unknown) {
    console.error('Test login error:', error);
    res.status(500).json({ ok: false, error: 'Login failed' });
  }
});

// Get current user session using unified auth
r.get("/me", (req: any, res: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.auth_token;
  
  if (!token) {
    return res.status(401).json({ ok: false, error: "missing_token" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    res.json({ 
      ok: true, 
      user: { 
        id: payload.sub || payload.id, 
        email: payload.email, 
        roles: payload.roles || [] 
      } 
    });
  } catch {
    res.status(401).json({ ok: false, error: "invalid_token" });
  }
});

export default r;