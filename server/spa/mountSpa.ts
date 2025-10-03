import path from "path";
import fs from "fs";
import express, { Request, Response } from "express";

export function mountSpa(app: express.Express, clientDistAbs: string) {
  const dist = path.resolve(clientDistAbs);

  // 1) Static assets: long cache for hashed files
  app.use(
    "/",
    express.static(dist, {
      fallthrough: true,
      setHeaders(res, filePath) {
        // hashed assets => cache, but never cache index.html
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-store");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );

  // 2) SPA fallback: always serve fresh index.html
  function sendIndex(_req: Request, res: Response) {
    const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
    res.setHeader("Cache-Control", "no-store");
    res.type("html").send(html);
  }

  // Staff app routes (EXCLUDING root "/" to avoid conflicts) 
  app.get(["/staff", "/staff/*"], sendIndex);
}