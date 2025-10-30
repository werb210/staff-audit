import express from "express";
// Keep registry across imports
const REG = global.__ROUTE_REG__ ?? new Map();
global.__ROUTE_REG__ = REG;
const METHODS = ["get", "post", "put", "patch", "delete", "options", "head", "all"];
export function activateRouteDeduper(logger = console) {
    if (global.__ROUTE_DEDUP_ACTIVE__) {
        return;
    }
    global.__ROUTE_DEDUP_ACTIVE__ = true;
    const wrap = (obj, name) => {
        const orig = obj[name];
        obj[name] = function (path, ...handlers) {
            // Only dedupe string paths (ignore regex)
            const p = typeof path === "string" ? path : undefined;
            const key = p ? `${name.toUpperCase()} ${p}` : undefined;
            if (key) {
                const arr = REG.get(key) ?? [];
                // If already registered by another file, skip and record
                if (arr.length > 0) {
                    REG.set(key, [...arr, stackTraceOneLine()]);
                    logger.warn(`[ROUTE] duplicate skipped -> ${key}`);
                    return this; // skip second+ registrations
                }
                REG.set(key, [stackTraceOneLine()]);
            }
            return orig.call(this, path, ...handlers);
        };
    };
    // Patch app + router prototypes
    const appProto = express();
    METHODS.forEach(m => wrap(appProto, m));
    METHODS.forEach(m => wrap(express.Router.prototype, m));
    logger.info("[ROUTE] de-dup active (duplicates will be skipped and reported)");
}
export function routeReport() {
    const lines = [];
    REG.forEach((stacks, key) => { if (stacks.length > 1)
        lines.push(`${key}  (x${stacks.length})`); });
    return lines.sort().join("\n");
}
function stackTraceOneLine() {
    const e = new Error();
    const s = (e.stack || "").split("\n").slice(3).find(l => /at /.test(l)) || "";
    return s.replace(/\s+/g, " ").trim();
}
