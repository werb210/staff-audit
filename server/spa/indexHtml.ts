import path from "path";
import type { Express, Request, Response, NextFunction } from "express";

export function mountSpaFallback(app: Express) {
  const DIST = path.resolve(process.cwd(), "client", "dist");
  const index = path.join(DIST, "index.html");
  
  console.log(`🎯 [SPA-FALLBACK] Mounting SPA fallback for index.html: ${index}`);
  
  // Serve SPA for specific routes (EXCLUDING root "/" to avoid conflicts)
  app.get(["/login", "/forgot", "/reset", "/invite/accept", "/admin/*", "/ops/*", "/docs/*"], (req: Request, res: Response) => {
    console.log(`🎯 [SPA-FALLBACK] Serving SPA for: ${req.path}`);
    return res.sendFile(index);
  });
}