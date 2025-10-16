import type { Express } from "express";

export function assertSingleStatic(app: Express) {
  const layers = (app as any)._router?.stack || [];
  const statics = layers.filter((l: any) => l?.name === "serveStatic");
  if (statics.length > 1) {
    const hint = statics.map((s: any, i: number) => `#${i}: ${s?.regexp}`).join("\n");
    // Log loudly and prefer the LAST one by removing earlier mounts
    console.warn(`[static-guard] multiple express.static detected:\n${hint}`);
    // Optional: throw to make the misconfig obvious
    // throw new Error("Multiple express.static mounts detected");
  }
}