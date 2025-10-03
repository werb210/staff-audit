// Stub file for AI helpers router
import { Router } from 'express';
const router = Router();

// TODO: implement AI helpers logic
router.get('/ai-helpers', (req, res) => {
  res.json({ status: 'ok', message: 'AI helpers stub' });
});

export default router;