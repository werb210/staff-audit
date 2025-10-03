import path from "path";
import fs from "fs";
import express, { Express, Request, Response } from "express";

function findDistDir(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "client/dist"),
    path.resolve("client/dist"),
    path.resolve("../client/dist"),
  ];
  for (const d of candidates) {
    if (fs.existsSync(path.join(d, "index.html"))) return d;
  }
  return null;
}

export function mountSpa(app: Express, rootPath: string) {
  const distDir = findDistDir();
  if (distDir) {
    // Never cache HTML files (so index.html always points to latest hashed assets)
    app.use((req: Request, res: Response, next) => {
      if (req.method === "GET" && (req.path === "/" || req.path.endsWith(".html"))) {
        res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
      }
      next();
    });

    // Serve static assets with aggressive caching for hashed files
    app.use(rootPath, express.static(distDir, { 
      fallthrough: true,
      maxAge: "1y",
      etag: false,
      lastModified: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    
    // SPA catch-all for non-asset routes only
    app.get(`${rootPath}/*`, (req: Request, res: Response) => {
      if (req.path.includes('/assets/')) {
        return res.status(404).end(); // Don't catch asset requests
      }
      res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
      res.sendFile(path.join(distDir, "index.html"));
    });
    console.log(`[SPA] Mounted ${rootPath} -> ${distDir}`);
  } else {
    app.get(`${rootPath}/*`, (_: Request, res: Response) => {
      res.status(200).send(`<!doctype html><meta charset="utf-8">
<title>Staff SPA (dev placeholder)</title>
<body style="font:14px/1.5 system-ui;padding:24px">
<h1>Staff SPA placeholder</h1>
<p>No built assets found. Run <code>pnpm -C client build</code> and restart the server.</p>
</body>`);
    });
    console.warn(`[SPA] Build not found. Serving placeholder for ${rootPath}.`);
  }
}