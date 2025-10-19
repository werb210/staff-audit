import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    message: "Sales Pipeline API connected",
    timestamp: new Date().toISOString(),
  });
});

export default router;
