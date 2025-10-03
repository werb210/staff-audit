import { Router, Request, Response } from 'express';

const router = Router();

// Simple test route without any middleware
router.get('/', (req: Request, res: Response) => {
  console.log('🧪 TEST ROUTE: /api/applications working!');
  res.json({ 
    success: true, 
    message: 'Test applications route is working!',
    timestamp: new Date().toISOString()
  });
});

export default router;