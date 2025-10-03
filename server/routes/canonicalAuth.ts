// CANONICAL AUTHENTICATION ROUTER - SINGLE LOGIN ROUTE
// Implements exactly ONE POST /api/auth/login to resolve route conflicts

import { Router, Request, Response } from 'express';
import { verifyAuthToken, signAuthToken } from '../utils/jwt';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const router = Router();

// CANONICAL LOGIN ROUTE - standardized response format
router.post("/login", async (req: Request, res: Response) => {
  console.log('🔐 [CANONICAL-AUTH] Login request received');
  
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json({ 
        ok: false, 
        reason: 'missing_credentials' 
      });
    }

    // Get user from database
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !await bcrypt.compare(password, user.passwordHash!)) {
      return res.status(401).json({ 
        ok: false, 
        reason: 'invalid_credentials' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        ok: false, 
        reason: 'account_inactive' 
      });
    }

    // Generate standardized JWT token with userId (not id)
    const token = signAuthToken({ 
      userId: user.id, 
      role: user.role, 
      email: user.email 
    });

    // Set standardized bf_auth cookie 
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('bf_auth', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Set auth_token cookie for backward compatibility during transition
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000
    });

    // Add standardization header
    res.setHeader('X-Auth-Source', 'canonicalAuth');

    console.log('✅ [CANONICAL-AUTH] Login successful:', user.email);

    // Return standardized response format
    return res.json({
      success: true,
      mfaRequired: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error: unknown) {
    console.error('❌ [CANONICAL-AUTH] Login error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// CANONICAL USER ROUTE - check authentication status
router.get("/user", async (req: Request, res: Response) => {
  try {
    const authCookie = req.cookies.bf_auth || req.cookies.auth_token;
    
    if (!authCookie) {
      return res.json({ authenticated: false, user: null });
    }

    const decoded = verifyAuthToken(authCookie);
    if (!decoded || !decoded.userId) {
      return res.json({ authenticated: false, user: null });
    }

    // Get fresh user data from database
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId));
    if (!user || !user.isActive) {
      return res.json({ authenticated: false, user: null });
    }

    return res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });

  } catch (error: unknown) {
    console.error('❌ [CANONICAL-AUTH] User check error:', error);
    return res.json({ authenticated: false, user: null });
  }
});

console.log('🔐 [CANONICAL-AUTH] Router loaded with POST /login and GET /user');

export { router as canonicalAuthRouter };