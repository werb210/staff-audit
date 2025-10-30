import { Router } from "express";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly.js";
const r = Router();
r.use(requireAuth);
// Middleware to track endpoint usage
export const trackEndpoint = (req, res, next) => {
    const method = req.method;
    const path = req.route?.path || req.path;
    // Track hit asynchronously without blocking request
    setImmediate(async () => {
        try {
            await db.execute(sql `
        INSERT INTO endpoint_hits (method, path, hits, last_hit_at) 
        VALUES (${method}, ${path}, 1, NOW())
        ON CONFLICT (method, path) 
        DO UPDATE SET hits = endpoint_hits.hits + 1, last_hit_at = NOW()
      `);
        }
        catch (error) {
            // Silent fail for tracking
        }
    });
    next();
};
// Get coverage report
r.get("/coverage/report", async (req, res) => {
    try {
        const { rows } = await db.execute(sql `
      SELECT method, path, hits, last_hit_at 
      FROM endpoint_hits 
      ORDER BY hits DESC, last_hit_at DESC
    `);
        const totalEndpoints = rows.length;
        const recentlyUsed = rows.filter(r => {
            const lastHit = new Date(r.last_hit_at);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            return lastHit > dayAgo;
        }).length;
        const coverage = totalEndpoints > 0 ? (recentlyUsed / totalEndpoints * 100).toFixed(1) : "0";
        res.json({
            ok: true,
            endpoints: rows,
            stats: {
                total: totalEndpoints,
                recentlyUsed,
                coverage: `${coverage}%`
            }
        });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: "Failed to get coverage report" });
    }
});
// Reset coverage data
r.post("/coverage/reset", async (req, res) => {
    try {
        await db.execute(sql `DELETE FROM endpoint_hits`);
        res.json({ ok: true, message: "Coverage data reset" });
    }
    catch (error) {
        res.status(500).json({ ok: false, error: "Failed to reset coverage" });
    }
});
export default r;
