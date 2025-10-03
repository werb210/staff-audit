// Central API router aggregator. Mounted at /api in boot.ts
import { Router } from "express";
import o365 from "./integrations/office365";

const router = Router();

// Integrations
router.use("/o365", o365);

// Add other grouped routers here in the future.

export default router;
