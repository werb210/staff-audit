import { Router } from 'express';
import { db } from '../../db';
import { applications } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Complete application endpoint - finalizes an application
router.post('/:id/complete', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { finalStatus } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Application ID is required'
      });
    }

    // Check current application status to prevent re-submissions
    const [currentApp] = await db
      .select({ status: applications.status, stage: applications.stage })
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);

    if (!currentApp) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // CRITICAL: Reject re-submissions if already in lender_match or later stages
    if (currentApp.status === 'lender_match' || 
        currentApp.status === 'approved' || 
        currentApp.status === 'funded' ||
        currentApp.stage === 'Lender Matching' ||
        currentApp.stage === 'Accepted' ||
        currentApp.stage === 'Funded') {
      return res.status(400).json({
        success: false,
        error: 'Application already finalized',
        message: `Application cannot be resubmitted. Current status: ${currentApp.status}, stage: ${currentApp.stage}`,
        currentStatus: currentApp.status,
        currentStage: currentApp.stage
      });
    }

    // Determine final status and stage
    const status = finalStatus || 'approved';
    const stage = status === 'approved' ? 'Accepted' : 'Denied';

    // Update application to completed status
    const [updatedApplication] = await db
      .update(applications)
      .set({
        status: status,
        stage: stage
      })
      .where(eq(applications.id, id))
      .returning();

    if (!updatedApplication) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    console.log(`✅ Application ${id} completed with status: ${status}`);

    res.json({
      success: true,
      message: `Application completed successfully with status: ${status}`,
      application: updatedApplication
    });

  } catch (error: unknown) {
    console.error('Error completing application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete application'
    });
  }
});

export default router;