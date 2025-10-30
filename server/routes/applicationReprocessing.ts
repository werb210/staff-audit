import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { applications, documents } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Schema for reprocessing request
const reprocessingSchema = z.object({
  applicationId: z.string().uuid(),
  reason: z.string().min(1, 'Reason is required'),
  requestNotification: z.boolean().default(true),
  staffNotes: z.string().optional()
});

// POST /api/application-reprocessing/request-resync
router.post('/request-resync', async (req: any, res: any) => {
  try {
    const { applicationId, reason, requestNotification, staffNotes } = reprocessingSchema.parse(req.body);

    console.log(`🔄 [REPROCESSING] Staff requesting form_data resync for ${applicationId}`);

    // Validate application exists
    const application = await db.select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (application.length === 0) {
      return res.status(404).json({
        error: 'Application not found',
        applicationId
      });
    }

    const app = application[0];

    // Check if application actually needs reprocessing
    const formData = app.formData || app.form_data || {};
    const hasFormData = Object.keys(formData).length > 0;

    if (hasFormData) {
      return res.status(400).json({
        error: 'Application already has complete form data',
        applicationId,
        currentFormDataKeys: Object.keys(formData)
      });
    }

    // Update application with reprocessing request
    await db.update(applications)
      .set({
        status: 'reprocessing_requested',
        updatedAt: new Date()
      })
      .where(eq(applications.id, applicationId));

    // Log the reprocessing request
    console.log(`✅ [REPROCESSING] Application ${applicationId} marked for reprocessing`);
    console.log(`📝 [REPROCESSING] Reason: ${reason}`);
    if (staffNotes) {
      console.log(`📋 [REPROCESSING] Staff Notes: ${staffNotes}`);
    }

    // Get document count for notification
    const documentCount = await db.select()
      .from(documents)
      .where(eq(documents.applicationId, applicationId));

    const response = {
      success: true,
      applicationId,
      action: 'reprocessing_requested',
      status: 'reprocessing_requested',
      reason,
      staffNotes,
      documentCount: documentCount.length,
      timestamp: new Date().toISOString(),
      notification: requestNotification ? {
        type: 'client_resubmission_required',
        message: 'Client will be notified to resubmit complete application data',
        channels: ['email', 'sms']
      } : null
    };

    // TODO: Integrate with notification system
    if (requestNotification) {
      console.log(`📧 [NOTIFICATION] Would send resubmission request to client for ${applicationId}`);
      console.log(`📱 [NOTIFICATION] SMS/Email: "Your application requires resubmission of complete form data"`);
    }

    res.json(response);

  } catch (error: unknown) {
    console.error('❌ [REPROCESSING] Error requesting resync:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to request reprocessing',
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// GET /api/application-reprocessing/status/:applicationId
router.get('/status/:applicationId', async (req: any, res: any) => {
  try {
    const { applicationId } = req.params;

    const application = await db.select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (application.length === 0) {
      return res.status(404).json({
        error: 'Application not found',
        applicationId
      });
    }

    const app = application[0];
    const formData = app.formData || app.form_data || {};
    const hasFormData = Object.keys(formData).length > 0;

    const status = {
      applicationId,
      status: app.status,
      hasFormData,
      formDataKeys: Object.keys(formData),
      needsReprocessing: !hasFormData && app.status === 'submitted',
      canRequestReprocessing: !hasFormData && app.status !== 'reprocessing_requested',
      timestamp: new Date().toISOString()
    };

    res.json(status);

  } catch (error: unknown) {
    console.error('❌ [REPROCESSING] Error getting status:', error);
    res.status(500).json({
      error: 'Failed to get reprocessing status',
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

export default router;