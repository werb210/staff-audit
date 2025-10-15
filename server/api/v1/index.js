import { Router } from "express";
import applicationsRouter from "./applications.js";

const router = Router();
router.use("/applications", applicationsRouter);

export default router;
