// scripts/guard-no-debug.js
import fs from 'fs';
import path from 'path';

const repo = process.cwd();
const banned = [
  '/debug', '/test', '/playground', '/#/direct',
  'NAVIGATION DEBUG', 'AUTH DISABLED',
  'HARDENED LOGIN - UNBREAKABLE', 'REAL STAFF PORTAL - NO MORE TEST PAGES!'
];

function walk(dir, list=[]) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) { if (!/node_modules|dist|build|\.git/.test(p)) walk(p, list); }
    else if (/\.(tsx?|jsx?|html|md)$/.test(f)) list.push(p);
  }
  return list;
}

const offenders = [];
for (const file of walk(repo)) {
  const txt = fs.readFileSync(file, 'utf8');
  for (const term of banned) {
    if (txt.includes(term)) offenders.push({ file, term });
  }
}

if (offenders.length) {
  console.error('❌ Debug/Test artifacts detected. Remove them before running:');
  for (const o of offenders) console.error(` - ${o.term}  →  ${o.file}`);
  process.exit(1);
}

console.log('✅ No debug/test artifacts found.');