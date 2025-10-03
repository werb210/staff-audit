// Stub file for voice router
import { Router } from 'express';
const router = Router();

// TODO: implement voice logic
router.get('/voice', (req, res) => {
  res.json({ status: 'ok', message: 'Voice stub' });
});

export default router;