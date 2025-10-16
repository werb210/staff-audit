import { Router } from 'express';
import { analyticsService } from '../../services/analyticsService';
import { authMiddleware } from '../../middleware/authJwt';

const router = Router();

// Apply authentication middleware
router.use(authMiddleware);

// Admin middleware for analytics access
const requireAnalyticsAccess = (req: any, res: any, next: any) => {
  const userRole = req.user?.role;
  
  // Allow admin and manager roles to access analytics
  if (!['admin', 'manager'].includes(userRole)) {
    return res.status(403).json({ 
      error: 'Analytics access requires admin or manager role' 
    });
  }
  next();
};

router.use(requireAnalyticsAccess);

// Get analytics summary
router.get('/summary', async (req: any, res: any) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days as string);
    
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
      return res.status(400).json({ 
        error: 'Days parameter must be between 1 and 365' 
      });
    }

    console.log(`[GA4] Fetching analytics summary for ${daysNum} days`);
    
    const summary = await analyticsService.getAnalyticsSummary(daysNum);
    
    res.json({
      success: true,
      data: summary,
      period: {
        days: daysNum,
        startDate: new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      },
      configured: analyticsService.isConfigured()
    });
  } catch (error: unknown) {
    console.error('Error fetching GA4 summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics summary',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Get real-time analytics
router.get('/realtime', async (req: any, res: any) => {
  try {
    console.log('[GA4] Fetching real-time analytics');
    
    const realTimeStats = await analyticsService.getRealTimeStats();
    
    res.json({
      success: true,
      data: realTimeStats,
      timestamp: new Date().toISOString(),
      configured: analyticsService.isConfigured()
    });
  } catch (error: unknown) {
    console.error('Error fetching real-time analytics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch real-time analytics',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Get analytics configuration status
router.get('/config', async (req: any, res: any) => {
  try {
    const configStatus = analyticsService.getConfigStatus();
    
    res.json({
      success: true,
      config: configStatus
    });
  } catch (error: unknown) {
    console.error('Error fetching analytics config:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics configuration',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Get traffic sources breakdown
router.get('/traffic-sources', async (req: any, res: any) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days as string);
    
    const summary = await analyticsService.getAnalyticsSummary(daysNum);
    
    res.json({
      success: true,
      data: {
        topSources: summary.topSources,
        totalSessions: summary.sessions,
        period: daysNum
      },
      configured: analyticsService.isConfigured()
    });
  } catch (error: unknown) {
    console.error('Error fetching traffic sources:', error);
    res.status(500).json({ 
      error: 'Failed to fetch traffic sources',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

export default router;