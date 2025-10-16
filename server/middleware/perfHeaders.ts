import type { Request, Response, NextFunction } from "express";
import compression from "compression";

export const compress = compression({
  // let proxies decide; standard defaults are fine
});

export function staticCacheHeaders(req: Request, res: Response, next: NextFunction){
  if (String(process.env.PERF_HEADERS_ENABLED||"true").toLowerCase()!=="true") return next();
  const url = req.originalUrl || req.url || "";
  // Heuristic: hashed assets like /assets/*.123abc.js or .css => cache forever
  const isAsset = /\/assets\/.+\.[a-f0-9]{6,8}\.(js|css|svg|png|jpg|webp|woff2?)$/i.test(url);
  if (isAsset) {
    const max = Number(process.env.STATIC_MAX_AGE||31536000);
    res.setHeader("Cache-Control", `public, max-age=${max}, immutable`);
  }
  next();
}