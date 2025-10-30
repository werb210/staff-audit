import { Router } from "express";
import { listMounts } from "../ops/routeRegistry";
const r = Router();
r.get("/routes", (_req, res) => res.json({ ok: true, mounts: listMounts() }));
r.get("/ping", (_req, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));
export default r;
