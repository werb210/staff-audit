import { Router } from "express";
import authRoutes from "./auth.js";
import applicationRoutes from "./applications.js";
import documentRoutes from "./documents.js";

const router = Router();

router.use('/auth', authRoutes);
router.use('/applications', applicationRoutes);
router.use('/documents', documentRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
