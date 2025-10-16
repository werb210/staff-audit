// Stub file for dialer router
import { Router } from 'express';
const router = Router();

// TODO: implement dialer logic
router.get('/dialer', (req, res) => {
  res.json({ status: 'ok', message: 'Dialer stub' });
});

export default router;