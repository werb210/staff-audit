import { Router } from "express";
import { detectBuild, maybeAutoBuild, getLastBuildStatus } from "../ops/autoBuild.js";
const r = Router();

r.get("/ops/build/doctor", (_req,res)=> {
  const status = detectBuild();
  res.json({ ok:true, status, last: getLastBuildStatus() });
});

r.post("/ops/build/doctor/rebuild", (_req,res)=> {
  const status = maybeAutoBuild(false);
  res.json({ ok: status.status==="ok", status });
});

export default r;