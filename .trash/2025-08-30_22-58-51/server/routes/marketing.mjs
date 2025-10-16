// Stub file for marketing router
import { Router } from 'express';
const router = Router();

// TODO: implement marketing logic
router.get('/marketing', (req, res) => {
  res.json({ status: 'ok', message: 'Marketing stub' });
});

export default router;