/**
 * 📨 MISSING DOCUMENTS REMINDER ROUTES
 * API endpoints for testing and managing missing document reminders
 */

import { Router } from 'express';
import { sendMissingDocsReminders } from '../jobs/missingDocsReminder.js';

const router = Router();

/**
 * POST /api/missing-docs/send-reminders
 * Manually trigger missing documents reminder job
 */
router.post('/send-reminders', async (req: any, res: any) => {
  try {
    console.log('📨 [MISSING-DOCS-API] Manual reminder job triggered');
    
    const result = await sendMissingDocsReminders();
    
    res.json(result);
    
  } catch (error: unknown) {
    console.error('❌ [MISSING-DOCS-API] Manual reminder job failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/missing-docs/status
 * Get status of missing documents reminder system
 */
router.get('/status', async (req: any, res: any) => {
  try {
    // Check if cron job is configured
    const cronStatus = process.env.NODE_ENV === 'production' ? 'enabled' : 'development';
    
    res.json({
      success: true,
      status: 'operational',
      cronStatus,
      schedule: '10:00 AM weekdays (Mon-Fri)',
      testEndpoint: '/api/missing-docs/send-reminders',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    console.error('❌ [MISSING-DOCS-API] Status check failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;