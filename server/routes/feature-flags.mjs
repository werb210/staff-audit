// Stub file for feature flags router
import { Router } from 'express';
const router = Router();

// TODO: implement feature flags logic
router.get('/feature-flags', (req, res) => {
  res.json({ status: 'ok', message: 'Feature flags stub' });
});

export default router;