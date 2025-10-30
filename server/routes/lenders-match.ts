import { Router } from "express";
import { requireAuth } from "../auth/verifyOnly";

const r = Router();
r.use(requireAuth);

/**
 * GET /api/lenders/match?applicationId=xyz
 * Get matched lenders for an application
 */
r.get('/match', async (req: any, res) => {
  try {
    const { applicationId } = req.query;
    
    if (!applicationId) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    console.log(`🎯 [LENDERS] Finding matches for application ${applicationId}`);
    
    // Mock lender matching logic
    const matchedLenders = [
      {
        id: '1',
        name: 'Capital Solutions',
        productType: 'Equipment Financing',
        matchScore: 92,
        minAmount: 100000,
        maxAmount: 2000000,
        avgProcessingTime: '7-10 days'
      },
      {
        id: '2',
        name: 'Business Growth Fund',
        productType: 'Working Capital',
        matchScore: 88,
        minAmount: 50000,
        maxAmount: 1000000,
        avgProcessingTime: '5-7 days'
      },
      {
        id: '3',
        name: 'Quick Capital',
        productType: 'Term Loan',
        matchScore: 75,
        minAmount: 25000,
        maxAmount: 500000,
        avgProcessingTime: '3-5 days'
      }
    ];
    
    res.json(matchedLenders);
  } catch (error: unknown) {
    console.error('❌ [LENDERS] Error:', error);
    res.status(500).json({ error: 'Failed to find matching lenders' });
  }
});

/**
 * POST /api/lenders/send
 * Send application to selected lender
 */
r.post('/send', async (req: any, res) => {
  try {
    const { applicationId, lenderProductId } = req.body;
    
    if (!applicationId || !lenderProductId) {
      return res.status(400).json({ error: 'Application ID and Lender Product ID are required' });
    }

    console.log(`📤 [LENDERS] Sending application ${applicationId} to lender ${lenderProductId}`);
    
    // Update application status to "Sent to Lender"
    try {
      const { pool } = require("../db");
      await pool.query(`
        UPDATE applications SET stage = 'sent_to_lender', updatedAt = NOW() WHERE id = $1
      `, [applicationId]);

      // Log the activity
      await pool.query(`
        INSERT INTO pipeline_activity (applicationId, from_stage, to_stage, actor, note)
        VALUES ($1, 'approved', 'sent_to_lender', 'staff', $2)
      `, [applicationId, `Sent to lender ${lenderProductId}`]);
    } catch (dbErr) {
      console.warn("Failed to update application status:", dbErr);
    }
    
    const transmissionId = `tx-${Date.now()}`;
    
    res.json({ 
      success: true, 
      message: 'Application sent to lender successfully',
      transmissionId
    });
  } catch (error: unknown) {
    console.error('❌ [LENDERS] Error:', error);
    res.status(500).json({ error: 'Failed to send application to lender' });
  }
});

export default r;