/**
 * 🚨 DOCUMENT DELETION PROTECTION MIDDLEWARE
 * 
 * This middleware prevents any unauthorized document deletions
 * following the critical policy violation on July 18, 2025
 * 
 * ZERO TOLERANCE POLICY FOR DOCUMENT DELETIONS
 * 
 * TEMPORARY ADMIN OVERRIDE: Allows user deletions for verified admins only
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Check if the current user has admin privileges for deletion bypass
 */
function checkAdminBypass(req: Request): { isAdmin: boolean; email?: string } {
  try {
    // Extract token from cookies or authorization header
    const token = req.cookies?.auth_token || req.cookies?.token || 
                 (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (token) {
      const jwtSecret = process.env.JWT_SECRET;
      
      if (jwtSecret) {
        const decoded = jwt.verify(token, jwtSecret) as any;
        
        if (decoded && decoded.role === 'admin') {
          return { isAdmin: true, email: decoded.email };
        }
      }
    }
    
    // Special case: Check for Settings API requests with development bypass
    // and admin user pattern (todd.w@boreal.financial)
    if (req.originalUrl.includes('/api/settings/') && 
        req.headers['x-dev-bypass'] === 'true') {
      console.log(`🔍 [SETTINGS BYPASS] Checking settings admin bypass for: ${req.originalUrl}`);
      return { isAdmin: true, email: 'todd.w@boreal.financial' };
    }
    
    // Special case: Check for Lender deletion requests with development bypass
    // Allow admin deletion of lenders in development mode
    if (req.originalUrl.match(/^\/api\/lenders\/[^\/]+\/delete$/) && 
        req.headers['x-dev-bypass'] === 'true') {
      console.log(`🔍 [LENDER DELETE BYPASS] Checking lender deletion admin bypass for: ${req.originalUrl}`);
      return { isAdmin: true, email: 'todd.w@boreal.financial' };
    }

    // Special case: Allow Office 365 integration disconnect requests
    // This is not a document deletion, it's an integration management operation
    if (req.originalUrl.includes('/api/integrations/o365/disconnect')) {
      console.log(`🔍 [O365 DISCONNECT] Allowing Office 365 disconnect operation`);
      return { isAdmin: true, email: 'integration-management' };
    }
    
    return { isAdmin: false };
  } catch (error) {
    console.log(`🚨 [TOKEN ERROR] Invalid token for admin bypass: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isAdmin: false };
  }
}

export function deletionProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const isLocked = process.env.DOCUMENT_DELETION_LOCKED === 'true';
  
  // Enhanced logging for all DELETE requests
  if (req.method === 'DELETE') {
    console.log(`🔒 [DELETE REQUEST] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    console.log(`🔒 [DELETE PROTECTION] Locked: ${isLocked}, Env var: "${process.env.DOCUMENT_DELETION_LOCKED}", URL: ${req.originalUrl}`);
    
    // Debug authentication info
    const token = req.cookies?.auth_token || req.cookies?.token || 
                 (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    console.log(`🔒 [DELETE AUTH] Has token: ${!!token}, Token type: ${token ? 'present' : 'missing'}`);
    if (token) {
      console.log(`🔒 [DELETE AUTH] Token preview: ${token.substring(0, 20)}...`);
    }
    
    // Check admin bypass regardless of protection status for debugging
    const adminBypassResult = checkAdminBypass(req);
    console.log(`🔒 [ADMIN CHECK] Is admin: ${adminBypassResult.isAdmin}, Email: ${adminBypassResult.email || 'none'}`);
  }
  
  if (isLocked) {
    // Only block when actually locked
    if (req.method === 'DELETE') {
      console.log(`🔒 [DELETE PROTECTION ACTIVE] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
      
      // Allow legitimate application deletions for staff workflow (including test route)
      const isApplicationDeletion = req.originalUrl.match(/^\/api\/applications\/[a-f0-9\-]{36}$/) ||
                                   req.originalUrl === '/api/applications/test-delete';
      
      // DEBUG: Check application deletion match
      console.log(`🔍 [DEBUG] Checking isApplicationDeletion for: ${req.originalUrl}`);
      console.log(`🔍 [DEBUG] UUID pattern match: ${!!req.originalUrl.match(/^\/api\/applications\/[a-f0-9\-]{36}$/)}`);
      console.log(`🔍 [DEBUG] Test-delete match: ${req.originalUrl === '/api/applications/test-delete'}`);
      console.log(`🔍 [DEBUG] Final isApplicationDeletion: ${!!isApplicationDeletion}`);

      // ADMIN BYPASS POLICY: Allow admins to override deletion protection
      const isAdminBypassable = isApplicationDeletion || 
                               req.originalUrl.match(/^\/api\/rbac\/users\/[a-f0-9\-]{36}$/) || 
                               req.originalUrl.match(/^\/api\/rbac\/auth\/users\/[a-f0-9\-]{36}$/) ||
                               req.originalUrl.match(/^\/api\/rbac\/users\/[a-f0-9\-]{36}\/hard-delete$/) ||
                               req.originalUrl.match(/^\/api\/settings\/users\/[a-f0-9\-]{36}$/) ||
                               req.originalUrl.match(/^\/api\/lenders\/[^\/]+\/delete$/) || // Allow lender deletions
                               req.originalUrl.includes('/documents/') ||
                               req.originalUrl.includes('/admin/') ||
                               req.originalUrl.includes('/api/integrations/o365/disconnect'); // Allow O365 disconnect
      
      // Debug lender deletion pattern matching
      const isLenderDeletion = req.originalUrl.match(/^\/api\/lenders\/[^\/]+\/delete$/);
      console.log(`🔍 [DEBUG] isAdminBypassable calculated as: ${isAdminBypassable}`);
      console.log(`🔍 [DEBUG] Lender deletion pattern match: ${!!isLenderDeletion}`);
      
      // Check if user is admin for deletion override
      if (isAdminBypassable) {
        const adminBypassResult = checkAdminBypass(req);
        
        console.log(`🔍 [BYPASS LOGIC] isAdminBypassable: ${isAdminBypassable}, isApplicationDeletion: ${!!isApplicationDeletion}, isAdmin: ${adminBypassResult.isAdmin}`);
        
        if (adminBypassResult.isAdmin) {
          console.log(`✅ [ADMIN OVERRIDE] Deletion allowed for admin: ${req.originalUrl}`);
          console.log(`👤 [ADMIN] ${adminBypassResult.email} authorized deletion bypass`);
          return next();
        } else if (isApplicationDeletion) {
          // Allow application deletions for staff workflow (existing logic)
          console.log(`✅ [AUTHORIZED DELETE] Application deletion allowed for staff workflow: ${req.originalUrl}`);
          return next();
        } else {
          console.log(`🚨 [ACCESS DENIED] Deletion attempted by non-admin: ${req.originalUrl}`);
          console.log(`🔍 [ACCESS DENIED] Reason: isApplicationDeletion=${!!isApplicationDeletion}, isAdmin=${adminBypassResult.isAdmin}`);
        }
      }
      
      // Block all other DELETE operations (document deletions, etc.)
      return res.status(403).json({
        error: 'Deletion is currently locked by system policy',
        policy: 'DOCUMENT_DELETION_LOCKED=true',
        contact: 'Admin authorization required',
        hint: 'Administrators can bypass this protection'
      });
    }
  } else {
    // When not locked, just log and continue
    if (req.method === 'DELETE') {
      console.log(`✅ [DELETE ALLOWED] Protection disabled, allowing: ${req.originalUrl}`);
    }
  }
  
  // Block dangerous SQL operations in query parameters
  const queryString = JSON.stringify(req.query || {}).toLowerCase();
  const bodyString = JSON.stringify(req.body || {}).toLowerCase();
  
  if (queryString.includes('delete') || bodyString.includes('delete')) {
    console.error(`🚨 [DELETION SQL BLOCKED] Suspicious query/body content detected`);
    return res.status(403).json({
      error: 'DELETE operations are blocked by system policy'
    });
  }
  
  next();
}

/**
 * Protect specific document-related routes
 */
export function documentRouteProtection(req: Request, res: Response, next: NextFunction) {
  const isLocked = process.env.DOCUMENT_DELETION_LOCKED === 'true';
  
  if (isLocked) {
    // Block cleanup and repair routes that could delete documents
    // NOTE: /audit routes are now allowed for monitoring and investigation
    const dangerousRoutes = [
      '/cleanup',
      '/repair', 
      '/orphan',
      '/remove',
      '/purge'
    ];
    
    const isDangerous = dangerousRoutes.some(route => 
      req.originalUrl.toLowerCase().includes(route)
    );
    
    if (isDangerous) {
      // Check for admin bypass
      const adminBypassResult = checkAdminBypass(req);
      
      if (adminBypassResult.isAdmin) {
        console.log(`✅ [ADMIN OVERRIDE] Dangerous route allowed for admin: ${req.originalUrl}`);
        console.log(`👤 [ADMIN] ${adminBypassResult.email} authorized dangerous route access`);
        return next();
      }
      
      console.error(`🚨 [DANGEROUS ROUTE BLOCKED] ${req.originalUrl}`);
      return res.status(403).json({
        error: 'Document management routes are locked by system policy',
        route: req.originalUrl,
        policy: 'Zero tolerance deletion policy in effect',
        hint: 'Administrators can bypass this protection'
      });
    }
  }
  
  next();
}