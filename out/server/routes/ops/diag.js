import { Router } from "express";
const router = Router();
router.get("/diag", (_req, res) => res.json({
    build_id: String(process.env.BUILD_ID || ""),
    force_static: String(process.env.FORCE_STATIC || ""),
    time: new Date().toISOString()
}));
export default router;
