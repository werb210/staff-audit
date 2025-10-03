import { Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const r = Router();

r.get("/ops/spa-fingerprint", (_req, res) => {
  const root = path.resolve(__dirname, "..", "..");
  const dist = path.join(root, "client", "dist");
  const build = path.join(root, "client", "build");
  const clientDir = (process.env.FORCE_CLIENT_DIR && fs.existsSync(process.env.FORCE_CLIENT_DIR)) ? process.env.FORCE_CLIENT_DIR
                   : (fs.existsSync(dist) ? dist : (fs.existsSync(build) ? build : null));
  const indexPath = clientDir ? path.join(clientDir, "index.html") : null;
  let hash = null;
  if (indexPath && fs.existsSync(indexPath)) {
    hash = crypto.createHash("sha256").update(fs.readFileSync(indexPath)).digest("hex");
  }
  // list a few referenced assets
  const assets: string[] = [];
  if (indexPath && fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, "utf8");
    const rx = /(?:src|href)=["'](\/assets\/[^"']+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(html))) assets.push(m[1]);
  }
  res.json({
    ok: !!clientDir,
    pid: process.pid,
    cwd: process.cwd(),
    clientDir,
    indexPath,
    indexSha256: hash,
    buildTimeHeader: process.env.BUILD_TIME || null,
    forced: !!process.env.FORCE_CLIENT_DIR,
    firstAssets: assets.slice(0, 5)
  });
});

export default r;