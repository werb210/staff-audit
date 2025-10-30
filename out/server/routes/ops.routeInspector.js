import { Router } from "express";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const r = Router();
// Build info (commit/time/client dir)
r.get("/ops/build", (_req, res) => {
    const root = path.resolve(__dirname, "..", "..");
    const dist = path.join(root, "client", "dist");
    const build = path.join(root, "client", "build");
    const clientDir = fs.existsSync(dist) ? dist : (fs.existsSync(build) ? build : null);
    res.json({
        ok: true,
        pid: process.pid,
        port: process.env.PORT || 3001,
        clientDir,
        env: { NODE_ENV: process.env.NODE_ENV, PUBLIC_URL: process.env.PUBLIC_URL || null },
        buildTime: process.env.BUILD_TIME || null,
        commit: process.env.GIT_SHA || null
    });
});
// Express route stack
r.get("/ops/route-table", (req, res) => {
    // @ts-ignore
    const stack = req.app?._router?.stack || [];
    const routes = [];
    for (const layer of stack) {
        if (layer?.route?.path) {
            const methods = Object.keys(layer.route.methods).join(",").toUpperCase();
            routes.push({ path: layer.route.path, methods });
        }
        else if (layer?.name === "router" && layer?.handle?.stack) {
            for (const l of layer.handle.stack) {
                if (l?.route?.path) {
                    const methods = Object.keys(l.route.methods).join(",").toUpperCase();
                    routes.push({ path: l.route.path, methods });
                }
            }
        }
    }
    res.json({ ok: true, routes });
});
// Self-test: hit key SPA routes & confirm index.html is returned
r.get("/ops/self-test", async (_req, res) => {
    const base = process.env.INTERNAL_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const targets = ["/", "/contacts", "/pipeline", "/lenders", "/analytics/roi", "/productivity/tasks"];
    const results = [];
    for (const t of targets) {
        try {
            const rsp = await fetch(base + t, { method: "GET" });
            const text = await rsp.text();
            const ok = rsp.status === 200 && /<html/i.test(text) && /<div id="root">|<div id="app">/.test(text);
            results.push({ path: t, status: rsp.status, ok });
        }
        catch (e) {
            results.push({ path: t, error: e.message });
        }
    }
    res.json({ ok: results.every(x => x.ok), results });
});
export default r;
