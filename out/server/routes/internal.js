import { Router } from "express";
import { getRoutes } from "../util/routeRegistry.js";
export function internalRouter() {
    const r = Router();
    r.get("/build", (_req, res) => {
        res.json({
            app: "staff",
            env: process.env.NODE_ENV ?? "unknown",
            https_mode: process.env.HTTPS_MODE === "1" ? true : false,
            build: process.env.BUILD_TIME ?? "unknown",
            commit: process.env.COMMIT_SHA ?? "unknown",
            uptime_s: Math.round(process.uptime()),
            now: new Date().toISOString(),
            notes: "SPA build guard / ops-health endpoint",
        });
    });
    r.get("/routes", (_req, res) => {
        // Minimal redaction: do not expose query params or handlers
        res.json({
            count: getRoutes().length,
            routes: getRoutes(),
            generatedAt: new Date().toISOString(),
        });
    });
    return r;
}
