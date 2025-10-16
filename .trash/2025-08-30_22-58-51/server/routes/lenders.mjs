// Stub file for lenders router
import { Router } from 'express';
const router = Router();

// TODO: implement lenders logic
router.get('/lenders', (req, res) => {
  res.json({ status: 'ok', message: 'Lenders stub' });
});

export default router;