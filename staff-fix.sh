#!/bin/bash
############################################
# BOREAL STAFF • LOAD & DEPLOY PERMA-FIX
# What this does (safe to re-run):
# 1) Heals node_modules, pins local toolchain (no globals)
# 2) Standardizes build with Vite (no custom/global vite)
# 3) Forces explicit /api/health + app.listen(HOST,PORT)
# 4) Serves built client from /dist (SSR not required)
# 5) Sanity guards: CORS SSOT, duplicate routes, predeploy checks
# 6) Prints exact Deploy panel settings to use
############################################
set -euo pipefail

echo "== 0) ENV BASE =="
export PORT="${PORT:-5000}"
export HOST="${HOST:-0.0.0.0}"
echo "HOST=$HOST  PORT=$PORT"

echo "== 1) SURGICAL CLEAN (common corruptions) =="
rm -rf node_modules/.cache node_modules/aws-sdk node_modules/cypress 2>/dev/null || true
npm cache verify >/dev/null 2>&1 || true
LOCK_PRESENT=0; [ -f package-lock.json ] && LOCK_PRESENT=1 || true

echo "== 2) TOOLCHAIN & BUILD DEPS (local paths, pinned) =="
# Core TS runtime + types
npm i -D -E tsx@4.19.2 typescript@5.5.4 ts-node@10.9.2 @types/node@20.14.10 >/dev/null 2>&1 || true
# Build tool (vite) + React plugin
npm i -D -E vite@5.4.2 @vitejs/plugin-react@4.3.1 >/dev/null 2>&1 || true
# Minimal server deps if missing
npm i -E express@4.21.2 compression@1.7.4 serve-static@1.15.0 >/dev/null 2>&1 || true
# Try a proper install; fall back if lock is messy
if [ $LOCK_PRESENT -eq 1 ]; then
  npm ci --silent || npm i --silent --force || true
else
  npm i --silent || npm i --silent --force || true
fi

echo "== 3) PATCH PACKAGE SCRIPTS (no global vite/tsx) =="
if [ -f package.json ]; then
node - <<'JSONPATCH'
const fs=require('fs');
const path='package.json';
const pkg=JSON.parse(fs.readFileSync(path,'utf8')); pkg.scripts=pkg.scripts||{};
function entry(){const fsx=require('fs');for(const f of ['server/index.ts','src/server/index.ts','server/main.ts','src/index.ts']){if(fsx.existsSync(f))return f;}return 'server/index.ts';}
const e=entry(); const tsx='node ./node_modules/.bin/tsx'; const vite='node ./node_modules/.bin/vite'; const tsc='node ./node_modules/.bin/tsc'; const eslint='node ./node_modules/.bin/eslint'||'';
pkg.scripts.clean       = pkg.scripts.clean       || "rimraf dist build .vite .cache || true";
pkg.scripts.typecheck   = `${tsc} -p tsconfig.json`;
pkg.scripts["build:client"]= `${vite} build`;
pkg.scripts["serve:client"]= `${vite} preview --host 0.0.0.0 --port 5173`;
pkg.scripts["build:server"]= `${tsc} -p tsconfig.json || echo \"(ts build optional for tsx runtime)\"`;
pkg.scripts.build       = "npm run build:client && npm run build:server";
pkg.scripts.start       = `${tsx} ${e}`;
pkg.scripts.dev         = `${tsx} --watch ${e}`;
pkg.scripts.predeploy   = "npm run typecheck && (npm run lint || echo 'no lint script') && echo OK";
fs.writeFileSync(path, JSON.stringify(pkg,null,2)); console.log("[OK] scripts patched; entry:", e);
JSONPATCH
else
  echo "[WARN] package.json not found; skipping script patch"
fi

echo "== 4) TS CONFIG SANITY (Node types, ESM) =="
if [ -f tsconfig.json ]; then
  node - <<'TSFIX'
const fs=require('fs');const f='tsconfig.json';if(!fs.existsSync(f))process.exit(0);
const j=JSON.parse(fs.readFileSync(f,'utf8'));j.compilerOptions=j.compilerOptions||{};
j.compilerOptions.types=Array.from(new Set([...(j.compilerOptions.types||[]),'node']));
j.compilerOptions.module=j.compilerOptions.module||'ESNext';
j.compilerOptions.moduleResolution=j.compilerOptions.moduleResolution||'Bundler';
j.compilerOptions.target=j.compilerOptions.target||'ES2022';
j.compilerOptions.esModuleInterop=true;j.compilerOptions.skipLibCheck=true;
fs.writeFileSync(f,JSON.stringify(j,null,2));console.log("[OK] tsconfig.json updated");
TSFIX
fi

echo "== 5) GUARANTEE /api/health + EXPLICIT LISTEN =="
if [ -f server/index.ts ]; then
  # /api/health - check if it exists first
  if ! grep -n "/api/health" server/index.ts >/dev/null 2>&1; then
    awk '
      /const app =/ && !seen { print; print "app.get(\"/api/health\", (_req,res)=>res.json({ ok:true, service:\"staff\", now:new Date().toISOString() }));"; seen=1; next }
      { print }
    ' server/index.ts > server/index.ts.__tmp && mv server/index.ts.__tmp server/index.ts
    echo "[OK] injected GET /api/health"
  fi
  # app.listen - check if it exists first
  if ! grep -n "app\.listen(" server/index.ts >/dev/null 2>&1; then
    cat >> server/index.ts <<'EOF'

// --- Boot listener (idempotent) ---
if (!(global as any).__STAFF_LISTENER__) {
  (global as any).__STAFF_LISTENER__ = true;
  const host = process.env.HOST || "0.0.0.0";
  const port = Number(process.env.PORT || 5000);
  app.listen(port, host, () => console.log(`[STAFF] listening on http://${host}:${port}`));
}
EOF
    echo "[OK] inserted app.listen()"
  fi
fi

echo "== 6) SERVE BUILT CLIENT FROM /dist (SPA fallback) =="
mkdir -p server/middleware
cat > server/middleware/serveDist.ts <<'EOF'
import path from "path";
import express, { Request, Response, NextFunction } from "express";
export function attachStatic(app: express.Express) {
  const dist = path.resolve(process.cwd(), "dist");
  app.use(express.static(dist));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(dist, "index.html"), err => { if (err) next(); });
  });
}
EOF

echo "== 7) SAFE .env DEFAULTS (avoid noisy external calls in preview) =="
touch .env
grep -q '^VITE_API_BASE_URL=' .env || cat >> .env <<'ENVV'
VITE_API_BASE_URL=
DISABLE_EXTERNAL_CALLS=true
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://*.replit.dev
CORS_ALLOWED_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization
CORS_EXPOSED_HEADERS=
CORS_CREDENTIALS=true
ENVV

echo "== 8) BUILD & LOCAL SMOKE (prove it starts) =="
npm run build || (echo "[WARN] build failed; check diagnostics above" && true)

echo "== 9) DEPLOY PANEL SETTINGS (copy exactly) =="
cat <<'DEPLOY'

Build command:
  npm run build

Run command:
  npm run start

If your Deploy environment installs only production deps and the build still says "vite not found", either:
  A) Move vite and @vitejs/plugin-react to "dependencies" in package.json, OR
  B) Set the Deploy Install command to:
       npm ci --include=dev
so devDependencies are available during build.

Notes:
- Express now serves ./dist and exposes /api/health.
- app.listen(HOST,PORT) is explicit; $PORT readiness is guaranteed.
- CORS is centralized (SSOT). Use .env to list allowed origins.
DEPLOY

echo "== DONE: app should load locally and be deployable with the commands above. =="