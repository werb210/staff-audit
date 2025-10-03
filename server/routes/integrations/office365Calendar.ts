import { Router } from 'express';
import { office365CalendarService } from '../../services/office365CalendarService';
import { authMiddleware } from '../../middleware/authJwt';

const router = Router();

// Apply authentication middleware
router.use(authMiddleware);

// Get calendar sync status for current user
router.get('/status', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const status = await office365CalendarService.getSyncStatus(userId);
    
    res.json({
      success: true,
      status
    });
  } catch (error: unknown) {
    console.error('Error getting calendar sync status:', error);
    res.status(500).json({ 
      error: 'Failed to get sync status',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Trigger manual calendar sync
router.post('/sync', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`[O365-CAL] Manual sync triggered by user ${req.user?.email}`);
    
    const result = await office365CalendarService.triggerSync(userId);
    
    res.json(result);
  } catch (error: unknown) {
    console.error('Error triggering calendar sync:', error);
    res.status(500).json({ 
      success: false,
      message: `Sync failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'}`
    });
  }
});

// Get recent calendar events for a specific contact
router.get('/events/:contactId', async (req: any, res: any) => {
  try {
    const { contactId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // This would typically be implemented in a CRM service
    // For now, we'll return a simple success response
    res.json({
      success: true,
      events: [],
      message: 'Calendar events for contact - feature under development'
    });
  } catch (error: unknown) {
    console.error('Error fetching contact calendar events:', error);
    res.status(500).json({ 
      error: 'Failed to fetch calendar events',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

export default router;