import { Router } from "express";
import o365 from "./integrations/office365";

const router = Router();
router.use("/o365", o365);

export default router;
