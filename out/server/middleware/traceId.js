import { randomUUID, createHash } from "crypto";
export function traceId(req, res, next) {
    const id = req.headers["x-trace-id"] || randomUUID();
    req.__traceId = id;
    res.setHeader("X-Trace-Id", id);
    next();
}
/** Helper to log canonical snapshot meta when present */
export function logCanonicalMeta(req) {
    try {
        const body = req.body || {};
        const canon = body && typeof body === "object" ? body : {};
        const json = JSON.stringify(canon);
        const size = Buffer.byteLength(json, "utf8");
        const hash = createHash("sha256").update(json).digest("hex").slice(0, 16);
        // Avoid noisy logs if not v1
        if (canon.version === "ApplicationV1") {
            console.log(`🔎 Canonical snapshot size=${size}B hash=${hash} trace=${req.__traceId}`);
        }
    }
    catch { }
}
