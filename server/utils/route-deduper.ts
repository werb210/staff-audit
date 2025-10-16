import type { Application } from "express";
import express from "express";

// Keep registry across imports
const REG: Map<string,string[]> = (global as any).__ROUTE_REG__ ?? new Map();
(global as any).__ROUTE_REG__ = REG;

type Method = "get"|"post"|"put"|"patch"|"delete"|"options"|"head"|"all";
const METHODS: Method[] = ["get","post","put","patch","delete","options","head","all"];

export function activateRouteDeduper(logger: Console = console) {
  if ((global as any).__ROUTE_DEDUP_ACTIVE__) { return; }
  (global as any).__ROUTE_DEDUP_ACTIVE__ = true;

  const wrap = (obj:any, name:Method) => {
    const orig = obj[name];
    obj[name] = function(path: any, ...handlers:any[]) {
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
  const appProto = (express() as Application);
  METHODS.forEach(m => wrap((appProto as any), m));
  METHODS.forEach(m => wrap((express.Router as any).prototype, m));

  logger.info("[ROUTE] de-dup active (duplicates will be skipped and reported)");
}

export function routeReport(): string {
  const lines: string[] = [];
  REG.forEach((stacks, key) => { if (stacks.length>1) lines.push(`${key}  (x${stacks.length})`); });
  return lines.sort().join("\n");
}

function stackTraceOneLine(): string {
  const e = new Error(); const s = (e.stack||"").split("\n").slice(3).find(l=>/at /.test(l))||"";
  return s.replace(/\s+/g," ").trim();
}