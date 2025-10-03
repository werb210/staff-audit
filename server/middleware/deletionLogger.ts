/**
 * Deletion Logger Middleware
 * 
 * Logs all application deletions with comprehensive audit trail
 * Prevents auto-deletion of fallback applications during cleanup
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { sql } from 'drizzle-orm';

interface DeletionLogEntry {
  application_id: string;
  user_id?: string;
  user_email?: string;
  source: 'staff_ui' | 'api_call' | 'admin_cleanup' | 'auto_cleanup' | 'system_maintenance';
  deletion_reason?: string;
  ip_address?: string;
  user_agent?: string;
  deleted_at: string;
  application_data?: any;
}

export class ApplicationDeletionLogger {
  
  static async logDeletion(entry: DeletionLogEntry): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO application_deletion_log (
          application_id, user_id, user_email, source, deletion_reason,
          ip_address, user_agent, deleted_at, application_data
        ) VALUES (
          ${entry.application_id}, ${entry.user_id || null}, ${entry.user_email || null}, 
          ${entry.source}, ${entry.deletion_reason || null}, ${entry.ip_address || null}, 
          ${entry.user_agent || null}, ${entry.deleted_at}, ${JSON.stringify(entry.application_data) || null}
        )
      `);
      
      console.log(`🗑️ [DELETION LOG] Application ${entry.application_id} deleted by ${entry.user_email || 'system'} via ${entry.source}`);
    } catch (error) {
      console.error('❌ [DELETION LOG] Failed to log deletion:', error);
    }
  }

  static async preventFallbackDeletion(applicationId: string): Promise<boolean> {
    // Prevent deletion of fallback applications
    if (applicationId.startsWith('fallback_')) {
      console.log(`🛡️ [DELETION PROTECTION] Preventing deletion of fallback application: ${applicationId}`);
      return false;
    }
    
    // Check if application has fallback documents
    const fallbackDocs = await db.execute(sql`
      SELECT COUNT(*) as count FROM documents 
      WHERE application_id = ${applicationId} AND storage_status = 'fallback'
    `);
    
    const hasFallbackDocs = (fallbackDocs.rows[0] as any)?.count > 0;
    
    if (hasFallbackDocs) {
      console.log(`🛡️ [DELETION PROTECTION] Preventing deletion of application with fallback documents: ${applicationId}`);
      return false;
    }
    
    return true;
  }
}

export function deletionLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  // Capture original end method
  const originalEnd = res.end;
  
  // Override end method to log successful deletions
  res.end = function(chunk?: any, encoding?: any) {
    if (req.method === 'DELETE' && req.route?.path?.includes('applications') && res.statusCode >= 200 && res.statusCode < 300) {
      const applicationId = req.params.id;
      
      if (applicationId) {
        const logEntry: DeletionLogEntry = {
          application_id: applicationId,
          user_email: (req as any).user?.email || 'unknown',
          user_id: (req as any).user?.id,
          source: req.headers['x-admin-delete'] ? 'admin_cleanup' : 'staff_ui',
          deletion_reason: req.body?.reason || req.headers['x-deletion-reason'] as string,
          ip_address: req.ip || req.headers['x-forwarded-for'] as string,
          user_agent: req.headers['user-agent'],
          deleted_at: new Date().toISOString(),
          application_data: (req as any).deletedApplicationData
        };
        
        // Log asynchronously to not block response
        ApplicationDeletionLogger.logDeletion(logEntry).catch(console.error);
      }
    }
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

export { DeletionLogEntry };