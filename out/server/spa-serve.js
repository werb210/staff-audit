import path from "path";
import fs from "fs";
export function mountSpa(app) {
    const FRONTEND_DIST = path.join(process.cwd(), "client", "dist");
    const INDEX = path.join(FRONTEND_DIST, "index.html");
    if (!fs.existsSync(INDEX)) {
        console.error("[spa] missing client/dist/index.html");
        app.get("*", (_req, res) => res.status(500).send("SPA build missing"));
        return;
    }
    app.use(require("express").static(FRONTEND_DIST, { immutable: true, maxAge: "1y" }));
    app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api/"))
            return next();
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("Cache-Control", "no-store");
        res.sendFile(INDEX);
    });
}
