// Test endpoint to accept documents for ZIP download testing
import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// Accept all documents for a given application (for testing ZIP download)
router.post('/accept-all/:applicationId', async (req: any, res: any) => {
  const { applicationId } = req.params;
  
  try {
    console.log(`🧪 [TEST] Accepting all documents for application: ${applicationId}`);
    
    // Update all documents with storage keys to 'accepted' status
    const updateQuery = `
      UPDATE documents 
      SET status = 'accepted' 
      WHERE application_id = $1 
        AND storage_key IS NOT NULL 
        AND storage_key != ''
      RETURNING id, file_name, status
    `;
    
    const result = await pool.query(updateQuery, [applicationId]);
    
    console.log(`✅ [TEST] Accepted ${result.rows.length} documents`);
    
    res.json({
      success: true,
      message: `Accepted ${result.rows.length} documents for ZIP testing`,
      documents: result.rows
    });
    
  } catch (error: unknown) {
    console.error('❌ [TEST] Error accepting documents:', error);
    res.status(500).json({ error: 'Failed to accept documents' });
  }
});

export default router;