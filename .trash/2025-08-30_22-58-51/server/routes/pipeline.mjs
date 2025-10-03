// Stub file for pipeline router
import { Router } from 'express';
const router = Router();

// TODO: implement pipeline logic
router.get('/pipeline', (req, res) => {
  res.json({ status: 'ok', message: 'Pipeline stub' });
});

export default router;