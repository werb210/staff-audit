import { resolveTenantFromHeaders } from "./tenantMap";
export function tenancyMiddleware(req, _res, next) {
    const tenant = resolveTenantFromHeaders(req.headers);
    req.tenantId = tenant;
    req.tenantCfg = {
        s3Prefix: tenant === "slf" ? (process.env.SLF_S3_PREFIX || "slf/") : (process.env.BF_S3_PREFIX || "bf/"),
        mailFrom: tenant === "slf" ? (process.env.SLF_O365_FROM || "ops@slf.example")
            : (process.env.BF_O365_FROM || "ops@boreal.financial"),
        iframeAllow: (tenant === "slf" ? process.env.SLF_IFRAME_ALLOW : process.env.BF_IFRAME_ALLOW)?.split(",").filter(Boolean) || []
    };
    next();
}
