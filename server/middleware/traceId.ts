import { randomUUID, createHash } from "crypto";
import type { Request, Response, NextFunction } from "express";

export function traceId(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers["x-trace-id"] as string) || randomUUID();
  (req as any).__traceId = id;
  res.setHeader("X-Trace-Id", id);
  next();
}

/** Helper to log canonical snapshot meta when present */
export function logCanonicalMeta(req: Request) {
  try {
    const body = req.body || {};
    const canon = body && typeof body === "object" ? body : {};
    const json = JSON.stringify(canon);
    const size = Buffer.byteLength(json, "utf8");
    const hash = createHash("sha256").update(json).digest("hex").slice(0,16);
    // Avoid noisy logs if not v1
    if ((canon as any).version === "ApplicationV1") {
      console.log(`🔎 Canonical snapshot size=${size}B hash=${hash} trace=${(req as any).__traceId}`);
    }
  } catch {}
}