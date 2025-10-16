// Stub file for analytics router
import { Router } from 'express';
const router = Router();

// TODO: implement analytics logic
router.get('/analytics', (req, res) => {
  res.json({ status: 'ok', message: 'Analytics stub' });
});

export default router;