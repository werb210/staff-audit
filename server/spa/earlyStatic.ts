import path from "path";
import fs from "fs";
import express, { type Express } from "express";

export function mountEarlyStatic(app: Express){
  const DIST = path.resolve(process.cwd(), "client", "dist");
  const A = path.join(DIST, "assets");

  console.log(`📁 [EARLY-STATIC] Mounting static assets from: ${A}`);

  // Serve hashed assets FIRST (no auth, no json parser)
  app.use("/assets", (req, res, next) => {
    console.log(`📁 [ASSET-REQ] ${req.method} ${req.path}`);
    const filePath = path.join(A, req.path);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`❌ [ASSET-404] File not found: ${filePath}`);
      return res.status(404).json({ error: "Asset not found" });
    }
    
    // Set proper MIME types
    if (req.path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      console.log(`📁 [CSS] Serving with text/css MIME type`);
    } else if (req.path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      console.log(`📁 [JS] Serving with application/javascript MIME type`);
    }
    
    // Serve the file
    // DISABLED: Duplicate static mount - using canonical spaMount.ts only
    return res.status(410).send('Gone - using canonical spaMount only');
  });

  // Common root static files used by Vite builds
  for (const file of ["favicon.svg","favicon.ico","vite.svg","manifest.webmanifest"]) {
    app.get("/"+file, (_req,res) => res.sendFile(path.join(DIST, file)));
  }
}