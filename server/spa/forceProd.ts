import path from "path";
import express, { type Express, type Request, type Response, type NextFunction } from "express";

export function mountForceProd(app: Express){
  if (String(process.env.FORCE_STATIC||"").toLowerCase()!=="true") {
    console.log("🔧 [FORCE-PROD] DISABLED - FORCE_STATIC not set to true");
    return;
  }

  const DIST = path.resolve(process.cwd(), "client", "dist");
  const ASSETS = path.join(DIST, "assets");

  console.log("🚀 [FORCE-PROD] ACTIVATED - Serving production build from:", DIST);
  console.log("🚀 [FORCE-PROD] Assets directory:", ASSETS);

  // 1) Assets bypass FIRST (no auth/parsers) - with debug logging
  // DISABLED: Duplicate static mount - using canonical spaMount.ts only
  // app.use("/assets", (req, res, next) => {
  //   console.log(`🚀 [FORCE-PROD-ASSETS] Serving ${req.path} from production build`);
  //   express.static(ASSETS, {
  //     fallthrough: false, immutable: true, maxAge: "1h", index: false, extensions: false,
  //   })(req, res, next);
  // });

  // 2) Common root files
  for (const f of ["favicon.ico","favicon.svg","vite.svg","manifest.webmanifest"]) {
    app.get("/"+f, (_req,res)=> res.sendFile(path.join(DIST, f)));
  }

  // 3) SPA fallback for non-API GETs — with no-store to kill stale index.html
  app.get(/^\/(?!api\/)/, (req:Request, res:Response, next:NextFunction)=>{
    if (req.method!=="GET") return next();
    console.log(`🚀 [FORCE-PROD-SPA] Serving index.html for ${req.path}`);
    res.setHeader("Cache-Control","no-store");  // always fetch fresh index.html
    res.sendFile(path.join(DIST, "index.html"));
  });
}
