import path from "path";
import fs from "fs";
import crypto from "crypto";
import express from "express";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function mountStatic(app: express.Express) {
  // 1) Resolve the one true client dir (forced > dist > build)
  const root = path.resolve(__dirname, "..", "..");
  const dist = path.join(root, "client", "dist");
  const build = path.join(root, "client", "build");
  const forced = process.env.FORCE_CLIENT_DIR && fs.existsSync(process.env.FORCE_CLIENT_DIR) ? process.env.FORCE_CLIENT_DIR : null;
  const clientDir = forced || (fs.existsSync(dist) ? dist : (fs.existsSync(build) ? build : null));
  if (!clientDir) {
    console.warn("[static] No client build found (client/dist or client/build). SPA routes will 404.");
    return;
  }

  const indexHtml = path.join(clientDir, "index.html");
  const indexExists = fs.existsSync(indexHtml);
  if (!indexExists) console.warn("[static] index.html missing in", clientDir);

  const indexHash = indexExists
    ? crypto.createHash("sha256").update(fs.readFileSync(indexHtml)).digest("hex").slice(0, 16)
    : "missing";

  // Helper: infer base prefix for this request (works behind /d, /@user/repl, etc.)
  function inferBase(req: express.Request) {
    const orig = req.originalUrl || req.url;
    const suffix = req.path || "/";
    const prefix = orig.slice(0, Math.max(0, orig.length - suffix.length)) || "/";
    return prefix.replace(/\/+$/, "") || "/";
  }

  // 2) Provenance headers on every request
  app.use((req, res, next) => {
    res.setHeader("X-Request-Trace", `${process.pid}`);
    res.setHeader("X-Served-From", clientDir);
    res.setHeader("X-Index-Hash", indexHash);
    const buildTime = process.env.BUILD_TIME || (indexExists ? String(fs.statSync(indexHtml).mtimeMs) : "unknown");
    res.setHeader("X-Build-Time", buildTime);
    res.setHeader("X-Base-Inferred", inferBase(req));
    next();
  });

  // 3) Serve assets from ANY prefix:  /anything/assets/*  /anything/favicon.ico  etc.
  app.get(/^.*\/assets\/(.+)$/, (req, res) => {
    const rel = req.params[0];
    const filePath = path.join(clientDir, "assets", rel);
    if (fs.existsSync(filePath)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.sendFile(filePath);
    }
    res.status(404).end();
  });
  app.get(/^.*\/favicon\.ico$/, (_req, res) => {
    const p = path.join(clientDir, "favicon.ico");
    return fs.existsSync(p) ? res.sendFile(p) : res.status(404).end();
  });
  app.get(/^.*\/(manifest\.json|manifest\.webmanifest)$/, (_req, res) => {
    const p1 = path.join(clientDir, "manifest.json");
    const p2 = path.join(clientDir, "manifest.webmanifest");
    const p = fs.existsSync(p1) ? p1 : (fs.existsSync(p2) ? p2 : null);
    return p ? res.sendFile(p) : res.status(404).end();
  });

  // DISABLED: Duplicate static mount - using canonical spaMount.ts only
  // app.use(express.static(clientDir, {
  //   setHeaders(res, filePath) {
  //     if (filePath.endsWith("index.html")) {
  //       res.setHeader("Cache-Control", "no-store, must-revalidate");
  //     } else if (/\/assets\/.+\.[a-f0-9]{8,}\.(js|css|png|svg|woff2?)$/.test(filePath)) {
  //       res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  //     } else {
  //       res.setHeader("Cache-Control", "public, max-age=300");
  //     }
  //   }
  // }));

  // 5) SPA fallback: for ANY non-API path, send index.html with a dynamic <base>.
  app.get("*", (req, res) => {
    const p = req.path;
    if (p.startsWith("/api") || p.startsWith("/_next") || p.startsWith("/static")) return res.status(404).end();
    if (!indexExists) return res.status(500).send("Client build missing index.html");
    // Inject <base> dynamically so BrowserRouter knows the basename this request arrived under.
    const base = inferBase(req);
    let html = fs.readFileSync(indexHtml, "utf8"); // ok, we mutate string not file
    if (!/ <base /i.test(html)) {
      html = html.replace(
        /<head>/i,
        `<head><base href="${base}/"><meta name="app-base" content="${base}">`
      );
    }
    res.setHeader("Cache-Control", "no-store, must-revalidate");
    res.setHeader("X-Spa-Fallback", "index.html");
    res.type("html").send(html);
  });
}