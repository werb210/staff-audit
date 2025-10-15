import { Router } from "express";
import v1Router from "./v1/index.js";

const router = Router();
router.use("/v1", v1Router);

router.stack.forEach((layer) => {
  if (layer?.route) console.log("🧩 Registered route:", layer.route.path);
  else if (layer?.name === 'router') console.log("🧩 Mounted router:", layer.regexp);
});

console.log("✅ Loaded: server/api/index.js");

export default router;
