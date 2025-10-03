const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
pkg.scripts = pkg.scripts || {};

function detectEntry() {
  const fs2 = require('fs');
  const candidates = ['server/index.ts','src/server/index.ts','server/main.ts','src/index.ts'];
  for(const f of candidates){ if(fs2.existsSync(f)) return f; }
  return 'server/index.ts';
}

const entry = detectEntry();
const tsx = 'npx tsx'; // Use npx tsx since it works

pkg.scripts["start"] = `${tsx} ${entry}`;
pkg.scripts["dev"] = `${tsx} --watch ${entry}`;
pkg.scripts["start:real"] = `${tsx} ${entry}`;
pkg.scripts["dev:real"] = `${tsx} --watch ${entry}`;
pkg.scripts["start:safe"] = `${tsx} server/bootstrap/safe-server.ts`;
pkg.scripts["dev:safe"] = `${tsx} --watch server/bootstrap/safe-server.ts`;
pkg.scripts["test"] = pkg.scripts["test"] || "echo \"(no tests)\" && exit 0";

fs.writeFileSync('package.json', JSON.stringify(pkg,null,2));
console.log("[OK] scripts updated to use npx tsx, entry:", entry);