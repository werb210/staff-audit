import type { Express, Router } from "express";

type Mount = { method: "USE"; path: string; label: string; at: string };
const mounts = new Map<string, Mount>(); // key = "USE:/api/foo"

function siteOf(e = new Error()) {
  const line = (e.stack || "").split("\n")[3] || "";
  return line.trim();
}

export function registerUse(app: Express, path: string, router: Router, label: string) {
  const key = `USE:${path}`;
  if (mounts.has(key)) {
    const prev = mounts.get(key)!;
    throw new Error(
      `DUPLICATE ROUTE MOUNT: ${key}\nExisting: ${prev.label} @ ${prev.at}\nAttempted: ${label} @ ${siteOf()}`
    );
  }
  mounts.set(key, { method: "USE", path, label, at: siteOf() });
  app.use(path, router);
}

export function listMounts() {
  return Array.from(mounts.values());
}