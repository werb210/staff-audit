import { Router } from "express";
import { requireRole } from "../security/rbac";
import { audit } from "../services/audit";
const router = Router();
router.get("/", requireRole(["manager", "admin"]), (_req, res) => res.json({ items: audit.recent() }));
export default router;
