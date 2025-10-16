import type { Request, Response, NextFunction } from "express";
import { resolveTenantFromHeaders, TenantId } from "./tenantMap";

export function tenancyMiddleware(req: Request, _res: Response, next: NextFunction){
  const tenant: TenantId = resolveTenantFromHeaders(req.headers);
  (req as any).tenantId = tenant;
  (req as any).tenantCfg = {
    s3Prefix: tenant === "slf" ? (process.env.SLF_S3_PREFIX || "slf/") : (process.env.BF_S3_PREFIX || "bf/"),
    mailFrom: tenant === "slf" ? (process.env.SLF_O365_FROM || "ops@slf.example")
                               : (process.env.BF_O365_FROM  || "ops@boreal.financial"),
    iframeAllow: (tenant === "slf" ? process.env.SLF_IFRAME_ALLOW : process.env.BF_IFRAME_ALLOW)?.split(",").filter(Boolean) || []
  };
  next();
}