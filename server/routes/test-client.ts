import { Router } from "express";

const router = Router();

// Simple test endpoint that definitely bypasses auth
router.get("/test", (req: any, res: any) => {
  res.json({ 
    success: true, 
    message: "Client API is working!",
    timestamp: new Date().toISOString(),
    path: req.path 
  });
});

export default router;