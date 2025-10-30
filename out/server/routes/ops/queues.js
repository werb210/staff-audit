import { Router } from "express";
import { getKnownQueues, isQueuesOn, getCounts, listJobs, retryJob, removeJob, promoteJob, retryAllFailed, drainQueue } from "../../services/queue/queues";
const router = Router();
router.get("/queues/status", async (_req, res) => {
    if (!isQueuesOn())
        return res.json({ enabled: false, queues: [] });
    const names = getKnownQueues();
    const out = [];
    for (const n of names) {
        const c = await getCounts(n);
        out.push({ name: n, bull: !!c, counts: c || {} });
    }
    res.json({ enabled: true, queues: out });
});
router.get("/queues/:name/jobs", async (req, res) => {
    if (!isQueuesOn())
        return res.status(503).json({ error: "queues_disabled" });
    const { name } = req.params;
    const state = String(req.query.state || "failed");
    const offset = Number(req.query.offset || 0);
    const limit = Number(req.query.limit || 50);
    try {
        const rows = await listJobs(name, state, offset, limit);
        res.json({ rows, nextOffset: offset + rows.length });
    }
    catch (e) {
        res.status(500).json({ error: String(e?.message || e) });
    }
});
router.post("/queues/:name/:jobId/retry", async (req, res) => {
    try {
        res.json(await retryJob(req.params.name, req.params.jobId));
    }
    catch (e) {
        res.status(400).json({ error: String(e?.message || e) });
    }
});
router.post("/queues/:name/:jobId/remove", async (req, res) => {
    try {
        res.json(await removeJob(req.params.name, req.params.jobId));
    }
    catch (e) {
        res.status(400).json({ error: String(e?.message || e) });
    }
});
router.post("/queues/:name/:jobId/promote", async (req, res) => {
    try {
        res.json(await promoteJob(req.params.name, req.params.jobId));
    }
    catch (e) {
        res.status(400).json({ error: String(e?.message || e) });
    }
});
router.post("/queues/:name/retry-failed", async (req, res) => {
    try {
        res.json(await retryAllFailed(req.params.name, Number(req.body?.limit || 500)));
    }
    catch (e) {
        res.status(400).json({ error: String(e?.message || e) });
    }
});
router.post("/queues/:name/drain", async (req, res) => {
    try {
        res.json(await drainQueue(req.params.name, !!req.body?.delayed));
    }
    catch (e) {
        res.status(400).json({ error: String(e?.message || e) });
    }
});
export default router;
