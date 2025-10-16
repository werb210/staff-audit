import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
// Note: Using raw SQL queries due to schema structure
// import { lenderUsers, lenders } from '../../shared/schema';
import { eq, sql } from 'drizzle-orm';

declare global {
  namespace Express {
    interface Request {
      lenderUser?: {
        id: string;
        email: string;
        name: string;
        role: string;
        status: string;
        lenderId: string;
        lenderName: string;
        permissions: any;
      };
    }
  }
}

export const requireLenderAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] || req.cookies?.lender_auth_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied - authentication required'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured for lender authentication');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

    // Ensure this is a lender token
    if (decoded.role !== 'lender') {
      return res.status(403).json({
        success: false,
        error: 'Access denied - lender role required'
      });
    }

    // Get lender user details from database using raw SQL due to schema mismatch
    const lenderUserResult = await db
      .select({
        id: sql<string>`id`,
        lenderId: sql<string>`lender_id`,
        email: sql<string>`email`,
        firstName: sql<string>`first_name`,
        lastName: sql<string>`last_name`,
        status: sql<string>`status`,
        role: sql<string>`role`,
        permissions: sql<any>`permissions`
      })
      .from(sql`lender_users`)
      .where(sql`id = ${decoded.id}`)
      .limit(1);

    if (lenderUserResult.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token - user not found'
      });
    }

    const lenderUser = lenderUserResult[0];

    // Check if lender user is active
    if (lenderUser.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account is not active'
      });
    }

    // Get lender name separately using raw SQL due to schema mismatch
    const lenderData = await db
      .select({ name: sql<string>`company_name` })
      .from(sql`lenders`)
      .where(sql`id = ${lenderUser.lenderId}`)
      .limit(1);

    // Attach lender user to request object
    req.lenderUser = {
      id: lenderUser.id,
      email: lenderUser.email,
      name: `${lenderUser.firstName || ''} ${lenderUser.lastName || ''}`.trim(),
      role: lenderUser.role || 'lender_user',
      status: lenderUser.status || 'active',
      lenderId: lenderUser.lenderId,
      lenderName: lenderData[0]?.name || 'Unknown Lender',
      permissions: lenderUser.permissions
    };

    next();

  } catch (error) {
    console.error('Lender authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

export const requireLenderAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // First check if user is authenticated as a lender
  await requireLenderAuth(req, res, () => {
    // Then check if they have admin role for their lender
    const lenderUser = req.lenderUser;
    
    if (!lenderUser || lenderUser.role !== 'lender_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied - lender admin role required'
      });
    }

    next();
  });
};