import { Router } from "express";
import applicationsRouter from "./applications.js";

const router = Router();
router.use("/applications", applicationsRouter);

router.stack.forEach((layer) => {
  if (layer?.route) console.log("📡 Route:", layer.route.path);
  else if (layer?.name === 'router') console.log("📡 Subrouter mounted:", layer.regexp);
});

console.log("✅ Loaded: server/api/v1/index.js");

export default router;
