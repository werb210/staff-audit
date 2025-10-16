// Stub file for dashboard router
import { Router } from 'express';
const router = Router();

// TODO: implement dashboard logic
router.get('/dashboard', (req, res) => {
  res.json({ status: 'ok', message: 'Dashboard stub' });
});

export default router;