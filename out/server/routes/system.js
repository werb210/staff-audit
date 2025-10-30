// server/routes/system.ts - System dashboard: stop the 404s (thin stubs)
import { Router } from 'express';
export const router = Router();
router.get('/kpis', (_req, res) => res.json({ apps: 0, value: 0, conversion30d: 0, avgCycleDays: 0 }));
router.get('/stats', (_req, res) => res.json({ contacts: 0, lenders: 0, products: 0 }));
router.get('/activity', (_req, res) => res.json({ items: [] }));
export default router;
