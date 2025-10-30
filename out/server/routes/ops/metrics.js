import { Router } from "express";
import client from "prom-client";
const router = Router();
const enabled = String(process.env.ENABLE_METRICS || "true") === "true";
const Registry = client.Registry;
const register = new Registry();
client.collectDefaultMetrics({ register });
export const httpCounter = new client.Counter({
    name: "http_requests_total",
    help: "HTTP request count",
    labelNames: ["method", "route", "status"]
});
export const httpDuration = new client.Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP durations",
    labelNames: ["method", "route"],
    buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});
register.registerMetric(httpCounter);
register.registerMetric(httpDuration);
router.get("/metrics", async (_req, res) => {
    if (!enabled)
        return res.status(404).end();
    res.setHeader("Content-Type", register.contentType);
    res.end(await register.metrics());
});
export default router;
