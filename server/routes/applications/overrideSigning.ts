import { Router } from 'express';
import { pool } from '../../db';
import { validateAndNormalizeUUID } from '../../utils/uuidValidator';

const router = Router();

// DEBUG: Log all requests hitting this router
router.use('*', async (req: any, res: any, next: any) => {
  console.log(`🔧 OverrideSigning Router - ${req.method} ${req.originalUrl} - Base: ${req.baseUrl}, Path: ${req.path}`);
  
  // Database checkpoint for tracking
  try {
    await pool.query(`
      INSERT INTO debug_tracking (operation, details) 
      VALUES ($1, $2)
    `, [`overrideSigning_router_hit`, JSON.stringify({
      method: req.method,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      path: req.path,
      timestamp: new Date().toISOString()
    })]);
  } catch (error: unknown) {
    // Silent fail if table doesn't exist
  }
  
  next();
});

// PATCH /api/public/applications/:id/override-signing
// Manual override for development/testing - sets signed = true
router.patch('/:id/override-signing', async (req: any, res: any) => {
  try {
    const applicationId = validateAndNormalizeUUID(req.params.id);
    
    console.log(`🔧 Manual signing override for application: ${applicationId}`);
    
    // Update application to mark as signed
    const updateQuery = `
      UPDATE applications 
      SET 
        signed = true,
        signing_status = 'completed',
        signed_at = NOW(),
        stage = 'Lender Match',
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, signed, signing_status, stage, signed_at
    `;
    
    const result = await pool.query(updateQuery, [applicationId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }
    
    const updatedApplication = result.rows[0];
    
    console.log(`✅ Signing override completed:`, {
      applicationId,
      signed: updatedApplication.signed,
      signingStatus: updatedApplication.signing_status,
      stage: updatedApplication.stage,
      signedAt: updatedApplication.signed_at
    });
    
    res.json({
      success: true,
      message: 'Signing status manually overridden',
      data: {
        applicationId,
        signed: updatedApplication.signed,
        signingStatus: updatedApplication.signing_status,
        stage: updatedApplication.stage,
        signedAt: updatedApplication.signed_at
      }
    });
    
  } catch (error: unknown) {
    console.error('❌ Error overriding signing status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to override signing status',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;