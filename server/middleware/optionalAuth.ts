/**
 * Optional Authentication Middleware
 * Provides authentication bypass for development and optional authentication for APIs
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export interface OptionalAuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
    firstName?: string;
    lastName?: string;
  };
}

/**
 * Optional authentication middleware with development bypass
 * Allows requests to proceed with or without authentication
 */
export function optionalAuth(req: OptionalAuthRequest, res: Response, next: NextFunction) {
  // DEVELOPMENT BYPASS: Allow dev access with special header
  if (process.env.NODE_ENV === 'development' && req.headers['x-dev-bypass'] === 'true') {
    console.log('🔓 Development authentication bypass activated');
    req.user = {
      id: '5cfef28a-b9f2-4bc3-8f18-05521058890e',
      email: 'admin@boreal.com',
      role: 'admin',
      tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      firstName: 'Admin',
      lastName: 'User'
    };
    return next();
  }

  // Extract JWT token from cookie or Authorization header
  const token = req.cookies.auth_token || 
               req.cookies.token || 
               (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') 
                 ? req.headers.authorization.slice(7) 
                 : null);

  // If no token, continue without user (optional auth)
  if (!token) {
    console.log('🔓 No authentication token provided - proceeding without user context');
    return next();
  }

  try {
    // Verify JWT token if provided
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.warn('⚠️ JWT_SECRET not configured - proceeding without auth');
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Set user context if token is valid
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user',
      tenantId: decoded.tenantId || '1',
      firstName: decoded.firstName,
      lastName: decoded.lastName
    };

    console.log(`🔓 Optional auth successful for user: ${req.user.email} (${req.user.role})`);
    next();
  } catch (error) {
    // Token invalid, but continue without user (optional auth)
    console.log('🔓 Invalid token provided - proceeding without user context');
    next();
  }
}