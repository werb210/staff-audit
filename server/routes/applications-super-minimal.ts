import { Router, Request, Response } from 'express';

const router = Router();

// Super minimal test route with no middleware
router.get('/', async (req: Request, res: Response) => {
  console.log('🎯 Super minimal route reached!');
  try {
    const responseData = {
      success: true,
      message: 'Super minimal route working'
    };
    
    return res.json(responseData);
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

export default router;