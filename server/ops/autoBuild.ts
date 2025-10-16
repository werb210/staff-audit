import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type BuildStatus = {
  clientDir: string | null;
  indexExists: boolean;
  serverDistMtime?: number;
  indexMtime?: number;
  missingAssets: string[];
  status: "ok" | "missing" | "stale" | "error";
  message?: string;
  lastBuild?: { ok: boolean; code: number | null; durationMs: number; stdout?: string; stderr?: string };
};

let lastResult: BuildStatus | null = null;

function resolveClientDir(root: string) {
  const dist = path.join(root, "client", "dist");
  const build = path.join(root, "client", "build");
  if (fs.existsSync(dist)) return dist;
  if (fs.existsSync(build)) return build;
  return null;
}

function readMtime(p: string | null) {
  try { if (p) return fs.statSync(p).mtimeMs; } catch {}
  return undefined;
}

function referencedAssets(indexHtmlPath: string): string[] {
  try {
    const html = fs.readFileSync(indexHtmlPath, "utf8");
    const assets = new Set<string>();
    const rx = /(?:src|href)=["'](\/assets\/[^"']+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(html))) assets.add(m[1]);
    return [...assets];
  } catch { return []; }
}

export function detectBuild(): BuildStatus {
  const root = path.resolve(__dirname, "..", "..");
  const clientDir = resolveClientDir(root);
  const serverDist = path.join(root, "server", "dist", "index.js");
  const serverDistMtime = readMtime(serverDist);
  if (!clientDir) {
    return (lastResult = {
      clientDir: null, indexExists: false, serverDistMtime, missingAssets: [],
      status: "missing", message: "No client build directory (client/dist or client/build) found."
    });
  }
  const indexHtml = path.join(clientDir, "index.html");
  const indexExists = fs.existsSync(indexHtml);
  if (!indexExists) {
    return (lastResult = {
      clientDir, indexExists: false, serverDistMtime, missingAssets: [],
      status: "missing", message: "index.html missing in client build directory."
    });
  }
  const indexMtime = readMtime(indexHtml);
  // If server build is newer than index by more than 2 minutes, likely stale client.
  const staleByTime = !!(serverDistMtime && indexMtime && serverDistMtime > indexMtime + 120_000);
  // Verify hashed asset references exist.
  const refs = referencedAssets(indexHtml);
  const missingAssets: string[] = [];
  for (const a of refs) {
    const abs = path.join(clientDir, a.replace(/^\//, ""));
    if (!fs.existsSync(abs)) missingAssets.push(a);
  }
  const status: BuildStatus["status"] =
    !refs.length && !staleByTime ? "ok" :
    missingAssets.length ? "stale" :
    staleByTime ? "stale" : "ok";

  return (lastResult = { clientDir, indexExists, serverDistMtime, indexMtime, missingAssets, status });
}

export function maybeAutoBuild(onBoot = false): BuildStatus {
  const detected = detectBuild();
  const shouldAuto = (process.env.AUTO_BUILD ?? (onBoot ? "true" : "false")).toLowerCase() === "true";
  if (detected.status === "ok" || !shouldAuto) return detected;
  const root = path.resolve(__dirname, "..", "..");
  const start = Date.now();
  // Prefer root script "build:client" else fallback to "build".
  const script = fs.existsSync(path.join(root, "client", "package.json")) ? "build:client" : "build";
  const cmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const run = spawnSync(cmd, ["run", script], { cwd: root, env: process.env, encoding: "utf8", timeout: 8 * 60_000 });
  const durationMs = Date.now() - start;
  const ok = run.status === 0;
  const after = detectBuild();
  after.lastBuild = { ok, code: run.status, durationMs, stdout: run.stdout?.slice(-4000), stderr: run.stderr?.slice(-4000) };
  return (lastResult = after);
}

export function getLastBuildStatus(): BuildStatus | null {
  return lastResult;
}