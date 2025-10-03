import { Router, Request, Response } from 'express';

const router = Router();

// Minimal test route
router.get('/', async (req: Request, res: Response) => {
  console.log('🎯 [APPLICATIONS] GET / route handler reached!');
  try {
    const responseData = {
      success: true,
      applications: [],
      count: 0,
      source: 'minimal_test',
      message: 'Minimal applications endpoint working',
      timestamp: new Date().toISOString()
    };
    
    return res.json(responseData);
  } catch (error: any) {
    console.error('❌ Error in minimal route:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch applications',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
export const applicationsMinimalRouter = router;