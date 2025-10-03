// Stub file for global search router
import { Router } from 'express';
const router = Router();

// TODO: implement global search logic
router.get('/global-search', (req, res) => {
  res.json({ status: 'ok', message: 'Global search stub' });
});

export default router;