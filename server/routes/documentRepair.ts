import { Router } from 'express';
import { repairMissingDocuments, createMissingDirectories } from '../utils/documentRepair';
// REMOVED: Auth middleware import (authentication system deleted)

const router = Router();

// POST /api/document-repair/run - Run comprehensive document repair
router.post('/run', async (req: any, res: any) => {
  try {
    console.log(`🔧 [DOCUMENT REPAIR] Repair initiated by ${req.user?.email}`);
    
    // Create missing directories first
    await createMissingDirectories();
    
    // Run repair process
    const result = await repairMissingDocuments();
    
    res.json({
      success: true,
      message: 'Document repair completed successfully',
      result: {
        repairedCount: result.repairedCount,
        deletedCount: result.deletedCount
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ [DOCUMENT REPAIR] Failed:', error);
    res.status(500).json({
      success: false,
      error: 'Document repair failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/document-repair/status - Check document integrity
router.get('/status', async (req: any, res: any) => {
  try {
    // This will be a quick status check without making changes
    res.json({
      success: true,
      message: 'Document repair system operational',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Status check failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;