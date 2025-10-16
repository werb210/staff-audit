import { db } from '../db';
import { applications } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Upload Guard - Prevents uploads to invalid or submitted applications
 */
export async function validateApplicationForUpload(applicationId: string): Promise<{ valid: boolean; error?: string }> {
  try {
    console.log(`🔍 [UPLOAD GUARD] Validating application: ${applicationId}`);
    
    // Check if application exists and get status
    const application = await db
      .select({ id: applications.id, status: applications.status })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (!application || application.length === 0) {
      console.log(`❌ [UPLOAD GUARD] Application not found: ${applicationId}`);
      return { valid: false, error: 'Application not found' };
    }

    const app = application[0];
    console.log(`📋 [UPLOAD GUARD] Application status: ${app.status}`);

    // Allow uploads to draft and submitted applications
    // Block uploads to completed, rejected, or archived applications
    const allowedStatuses = ['draft', 'submitted', 'under_review', 'processing'];
    
    if (!allowedStatuses.includes(app.status)) {
      console.log(`🚫 [UPLOAD GUARD] Upload blocked - status: ${app.status}`);
      return { 
        valid: false, 
        error: `Cannot upload to ${app.status} application. Only draft and submitted applications accept uploads.` 
      };
    }

    console.log(`✅ [UPLOAD GUARD] Upload allowed for status: ${app.status}`);
    return { valid: true };

  } catch (error: unknown) {
    console.error(`❌ [UPLOAD GUARD] Validation error:`, error);
    return { valid: false, error: 'Validation failed' };
  }
}

/**
 * Audit function to log potential upload mismatches
 */
export async function auditUploadMismatch(applicationId: string, documentCount: number): Promise<void> {
  try {
    console.log(`📊 [UPLOAD AUDIT] Application ${applicationId} now has ${documentCount} documents`);
    
    // Check if application status and document count seem mismatched
    const application = await db
      .select({ status: applications.status, createdAt: applications.createdAt })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (application && application.length > 0) {
      const app = application[0];
      const daysSinceCreated = Math.floor((Date.now() - new Date(app.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      
      // Log potential issues
      if (app.status === 'draft' && daysSinceCreated > 7) {
        console.log(`⚠️ [UPLOAD AUDIT] Stale draft application: ${applicationId} (${daysSinceCreated} days old)`);
      }
      
      if (app.status === 'submitted' && documentCount === 0) {
        console.log(`⚠️ [UPLOAD AUDIT] Submitted application with no documents: ${applicationId}`);
      }
      
      if (documentCount > 20) {
        console.log(`⚠️ [UPLOAD AUDIT] High document count: ${applicationId} has ${documentCount} documents`);
      }
    }
  } catch (error: unknown) {
    console.error(`❌ [UPLOAD AUDIT] Audit error:`, error);
  }
}