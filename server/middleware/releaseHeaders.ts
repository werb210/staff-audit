import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

let cache: { ver:string, rel:string, at:number } = { ver: "", rel: "", at: 0 };

export async function releaseHeaders(_req:Request, res:Response, next:NextFunction){
  const now = Date.now();
  if (now - cache.at > 30_000) {
    try {
      const r = await db.execute(sql`SELECT version, codename FROM releases WHERE status='live' ORDER BY live_at DESC LIMIT 1`);
      const ver = r.rows?.[0]?.version || process.env.APP_VERSION || "0.0.0";
      const cd = r.rows?.[0]?.codename || "";
      cache = { ver, rel: cd, at: now };
    } catch {
      cache = { ver: process.env.APP_VERSION || "0.0.0", rel: "", at: now };
    }
  }
  res.setHeader("X-App-Version", cache.ver);
  if (cache.rel) res.setHeader("X-Release", cache.rel);
  next();
}