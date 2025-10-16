import path from "path";
import fs from "fs";
import type { Express, Request, Response, NextFunction } from "express";
export function mountSpa(app: Express){
  const FRONTEND_DIST = path.join(process.cwd(), "client", "dist");
  const INDEX = path.join(FRONTEND_DIST, "index.html");
  if(!fs.existsSync(INDEX)){
    console.error("[spa] missing client/dist/index.html");
    app.get("*", (_req:Request, res:Response)=>res.status(500).send("SPA build missing"));
    return;
  }
  app.use(require("express").static(FRONTEND_DIST, { immutable:true, maxAge:"1y" }));
  app.get("*", (req:Request,res:Response,next:NextFunction)=>{
    if(req.path.startsWith("/api/")) return next();
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(INDEX);
  });
}