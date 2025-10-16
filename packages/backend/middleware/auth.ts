import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthenticationError, AuthorizationError, TenantIsolationError } from './errorHandler';

// Extend Request type to include user and tenant info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'admin' | 'staff' | 'lender' | 'referrer' | 'client';
        tenantId: string;
        firstName?: string;
        lastName?: string;
      };
      tenantId?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for authentication');
}

export interface TokenPayload {
  id: string;
  email: string;
  role: 'admin' | 'staff' | 'lender' | 'referrer' | 'client';
  tenantId: string;
  firstName?: string;
  lastName?: string;
}

export const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h'
  });

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: '7d'
  });

  return { accessToken, refreshToken };
};

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new AuthenticationError('Invalid or expired token');
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch (error) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    req.user = decoded;
    req.tenantId = decoded.tenantId;
    
    next();
  } catch (error) {
    next(error);
  }
};

// Role-based authorization middleware
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
};

// Tenant isolation middleware
export const enforceTenantIsolation = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.tenantId) {
    return next(new AuthenticationError());
  }

  // Admin users can access any tenant (super admin)
  if (req.user.role === 'admin' && req.query.tenantId) {
    req.tenantId = req.query.tenantId as string;
  }

  // Ensure tenant isolation for all other operations
  // This will be used in database queries to filter by tenant
  next();
};

// Combined middleware for authenticated routes with tenant isolation
export const authenticatedRoute = [authenticate, enforceTenantIsolation];

// Combined middleware for role-based routes
export const authorizedRoute = (roles: string[]) => [
  authenticate,
  authorize(roles),
  enforceTenantIsolation
];

// Staff-only routes
export const staffOnly = authorizedRoute(['admin', 'staff']);

// Admin-only routes
export const adminOnly = authorizedRoute(['admin']);

// Client routes (for client portal)
export const clientOnly = authorizedRoute(['client']);

// Lender routes
export const lenderOnly = authorizedRoute(['admin', 'staff', 'lender']);

// Referrer routes
export const referrerOnly = authorizedRoute(['admin', 'staff', 'referrer']);