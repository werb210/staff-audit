import { Router } from "express";
import os from "os";
const r = Router();
let counters = {};
r.post("/tick/:key", (req, res) => { const k = req.params.key; counters[k] = (counters[k] || 0) + 1; res.json({ ok: true, key: k, value: counters[k] }); });
r.get("/stats", (_req, res) => { res.json({ pid: process.pid, uptime: process.uptime(), mem: process.memoryUsage(), load: os.loadavg(), counters }); });
export default r;
