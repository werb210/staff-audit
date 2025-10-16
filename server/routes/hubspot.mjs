// Stub file for HubSpot router
import { Router } from 'express';
const router = Router();

// TODO: implement HubSpot logic
router.get('/hubspot', (req, res) => {
  res.json({ status: 'ok', message: 'HubSpot stub' });
});

export default router;