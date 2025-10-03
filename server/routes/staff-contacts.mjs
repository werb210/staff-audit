// Stub file for staff contacts router
import { Router } from 'express';
const router = Router();

// TODO: implement staff contacts logic
router.get('/staff-contacts', (req, res) => {
  res.json({ status: 'ok', message: 'Staff contacts stub' });
});

export default router;