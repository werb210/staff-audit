// Stub file for notifications router
import { Router } from 'express';
const router = Router();

// TODO: implement notifications logic
router.get('/notifications', (req, res) => {
  res.json({ status: 'ok', message: 'Notifications stub' });
});

export default router;