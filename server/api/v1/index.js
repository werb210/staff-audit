import { Router } from "express";
import applicationsRouter from "./applications.js";

const router = Router();
router.use("/applications", applicationsRouter);

console.log("✅ Loaded: server/api/v1/index.js");

export default router;
