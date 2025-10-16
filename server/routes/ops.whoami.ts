import { Router } from "express";
import os from "os";
import fs from "fs";
import path from "path";
const r = Router();

r.get("/ops/whoami", (_req, res) => {
  res.json({
    ok: true,
    pid: process.pid,
    cwd: process.cwd(),
    host: os.hostname(),
    startedAt: new Date(Number(process.env.BUILD_TIME||Date.now())).toISOString(),
    note: "If you can see this JSON, the Node/Express server is serving your requests.",
  });
});

r.get("/ops/headers", (req: any, res: any) => {
  res.json({
    ok: true,
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
  });
});

export default r;