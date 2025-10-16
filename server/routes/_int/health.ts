import { Router } from "express";
const router = Router();

router.get("/health", (req: any, res: any) => {
  res.status(200).json({ 
    ok: true, 
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: "staff-app"
  });
});

export default router;