import type { Request, Response, NextFunction } from "express";
import { meter } from "../services/billing/core";

const IGNORE = [/^\/metrics/, /^\/_live/, /^\/_ready/, /^\/assets\//, /^\/webhooks\//];

export async function apiMeter(req:Request, res:Response, next:NextFunction){
  const path = req.path || req.url || "";
  if (!path.startsWith("/api/") || IGNORE.some(rx=> rx.test(path))) return next();

  const start = Date.now();
  res.on("finish", async ()=>{
    try {
      if (res.statusCode < 500 && req.method !== "OPTIONS") {
        await meter({ metric: "api_calls", qty: 1, meta: { path, method: req.method, ms: Date.now()-start } });
      }
    } catch {/* noop */}
  });
  next();
}