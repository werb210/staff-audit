// Route Registry - Centralized mounting with duplicate prevention
import type { Express, Router } from "express";

const registry = new Map<string, string>(); // basePath -> name
const FORBIDDEN = new Set(["/", "/api"]);   // too-greedy bases

export function mountRoute(
  app: Express,
  basePath: string,
  router: Router,
  name: string
) {
  if (FORBIDDEN.has(basePath)) {
    throw new Error(`[routes] "${name}" attempted to mount on forbidden base "${basePath}"`);
  }
  if (registry.has(basePath)) {
    const prev = registry.get(basePath);
    throw new Error(`[routes] duplicate base "${basePath}" (${prev} vs ${name})`);
  }
  app.use(basePath, router);
  registry.set(basePath, name);
  console.log(`✅ [ROUTE REGISTRY] Mounted: ${basePath} (${name})`);
}

export function listMountedRoutes() {
  return [...registry.entries()].map(([base, name]) => ({ base, name }));
}

export function clearRegistry() {
  registry.clear();
}

export function getRegistryStats() {
  return {
    total: registry.size,
    routes: listMountedRoutes(),
    forbidden: [...FORBIDDEN]
  };
}