import path from "path";
import fs from "fs";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
function noStore(res: Response){ res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"); res.setHeader("Pragma","no-cache"); res.setHeader("Expires","0"); res.setHeader("Surrogate-Control","no-store"); }
export function mountCacheBustingSpa(app: Express){
  const DIST = path.resolve(process.cwd(),"client","dist"); const ASSETS = path.join(DIST,"assets");
  const BUILD_ID = String(process.env.BUILD_ID || Math.floor(Date.now()/1000)); const PREFIX = `/assets-${BUILD_ID}`;
  // DISABLED: Duplicate static mount - using canonical spaMount.ts only
  // app.use(PREFIX, express.static(ASSETS,{fallthrough:false,immutable:true,maxAge:"1y",index:false}));
  // app.use(/^\/assets(?:-[^/]+)?\//, express.static(ASSETS,{fallthrough:false,immutable:true,maxAge:"1y",index:false}));
  for (const f of ["favicon.ico","favicon.svg","vite.svg","manifest.webmanifest"]) app.get("/"+f,(_req,res)=>res.sendFile(path.join(DIST,f)));
  app.get(/^\/(?!api\/|assets(?:-[^/]+)?\/)/,(_req:Request,res:Response,next:NextFunction)=>{
    let html:string; try{ html=fs.readFileSync(path.join(DIST,"index.html"),"utf8"); }catch{ return next(); }
    html = html.replace(/\/assets\//g, `${PREFIX}/`)
               .replace("</head>", `<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0"><meta http-equiv="Pragma" content="no-cache"><meta http-equiv="Expires" content="0"><script>window.__BUILD_ID__=${JSON.stringify(BUILD_ID)}</script></head>`);
    noStore(res); res.type("html").send(html);
  });
  console.log(`[spa] buildId=${BUILD_ID} • prefix=${PREFIX} • wildcard /assets-* enabled`);
}
