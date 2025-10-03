// Stub file for billing router
import { Router } from 'express';
const router = Router();

// TODO: implement billing logic
router.get('/billing', (req, res) => {
  res.json({ status: 'ok', message: 'Billing stub' });
});

export default router;