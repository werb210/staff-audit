import type { Express, Router } from "express";

const mounted = new Set<string>();

export function mountOnce(app: Express, path: string, router: Router) {
  if (mounted.has(path)) {
    console.warn(`[ROUTES] Skipping duplicate mount: ${path}`);
    return;
  }
  app.use(path, router);
  mounted.add(path);
}
