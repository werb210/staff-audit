import { Router } from "express";
import o365 from "./integrations/office365"; // already exists

const router = Router();
router.use("/o365", o365); // becomes /api/o365

export default router;
