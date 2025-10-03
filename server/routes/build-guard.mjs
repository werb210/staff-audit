// Stub file for build guard router
import { Router } from 'express';
const router = Router();

// TODO: implement build guard logic
router.get('/build-guard', (req, res) => {
  res.json({ status: 'ok', message: 'Build guard stub' });
});

export default router;