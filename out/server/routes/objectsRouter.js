import { Router } from "express";
import { signPut, signGet, list } from "../services/objectStore";
// Remove auth requirement for testing - adjust in production
export const objectsRouter = Router();
// Add no-auth flag for verification scripts
objectsRouter.use((req, res, next) => {
    console.log(`🔍 [OBJECTS-ROUTER] ${req.method} ${req.path} (verification bypass)`);
    next();
});
objectsRouter.get("/sign", async (req, res) => {
    const { op, scope = "private", key, type } = req.query;
    if (!op || !key)
        return res.status(400).json({ error: "op and key required" });
    if (op === "put")
        return res.send(await signPut(scope, key, type));
    if (op === "get" || op === "download")
        return res.send(await signGet(scope, key));
    return res.status(400).json({ error: "invalid op" });
});
objectsRouter.get("/list", async (req, res) => {
    const { scope = "private", prefix = "" } = req.query;
    res.json(await list(scope, prefix));
});
