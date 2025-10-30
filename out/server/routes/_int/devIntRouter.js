import express from "express";
import listEndpoints from "express-list-endpoints";
import buildGuard from "./buildGuard";
const r = express.Router();
r.get("/routes", (req, res) => {
    // @ts-ignore
    const endpoints = listEndpoints(req.app);
    const seen = new Map();
    const dups = [];
    for (const ep of endpoints)
        for (const m of ep.methods) {
            const key = m + " " + ep.path;
            const n = (seen.get(key) || 0) + 1;
            seen.set(key, n);
        }
    for (const [k, n] of seen.entries())
        if (n > 1) {
            const [method, path] = k.split(" ");
            dups.push({ method, path, count: n });
        }
    res.json({ endpoints, duplicates: dups });
});
r.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));
r.use("/build-guard", buildGuard);
export default r;
