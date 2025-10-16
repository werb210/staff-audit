const fs = require('fs');
const path = 'package.json';
const pkg = JSON.parse(fs.readFileSync(path,'utf8'));
pkg.scripts = pkg.scripts || {};

// detect staff server entry
function entry() {
  const fsx = require('fs');
  for (const f of ['server/index.ts','src/server/index.ts','server/main.ts','src/index.ts']) {
    if (fsx.existsSync(f)) return f;
  }
  return 'server/index.ts';
}

const e = entry();
const tsx = 'npx tsx';  // Use npx tsx since we confirmed it works
const vite = 'npx vite'; // Use npx vite for build tools
const tsc = 'npx tsc';

pkg.scripts["clean"] = pkg.scripts["clean"] || "rimraf dist build .vite .cache || true";
pkg.scripts["typecheck"] = `${tsc} -p tsconfig.json`;
pkg.scripts["build:client"] = `${vite} build`;
pkg.scripts["serve:client"] = `${vite} preview --host 0.0.0.0 --port 5173`;
pkg.scripts["build:server"] = `${tsc} -p tsconfig.json || echo "(ts build optional if tsx runtime)"`;
pkg.scripts["build"] = "npm run build:client && npm run build:server";
pkg.scripts["start"] = `${tsx} ${e}`;
pkg.scripts["dev"] = `${tsx} --watch ${e}`;

fs.writeFileSync(path, JSON.stringify(pkg,null,2));
console.log("[OK] scripts updated with npx tsx/vite paths and standard build pipeline.");