import { Router } from "express";
const r = Router();
r.get("/ops/base-info", (req, res) => {
    res.json({
        ok: true,
        basePath: (process.env.BASE_PATH || "/").replace(/\/+$/, "") || "/",
        forcedDir: process.env.FORCE_CLIENT_DIR || null,
        autoBuild: process.env.AUTO_BUILD || "false",
    });
});
export default r;
