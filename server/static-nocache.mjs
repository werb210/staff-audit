import path from "node:path";
import express from "express";
export default function mountStatic(app){
  const pub = path.resolve("dist/public");
  // No-store for HTML so UI sees new routes/forms immediately
  app.use((req,res,next)=>{
    if (req.method === "GET" && (req.path === "/" || req.path.endsWith(".html"))) {
      res.setHeader("Cache-Control","no-store, max-age=0");
      res.setHeader("Pragma","no-cache");
      res.setHeader("Expires","0");
    }
    next();
  });
  app.use(express.static(pub, { maxAge: "1d", extensions: ["html"] }));
  // Manual cache-bump
  app.post("/__cache/bust", (_req,res)=>{ res.setHeader("Cache-Control","no-store"); res.json({ ok:true, ts: Date.now() }); });
}