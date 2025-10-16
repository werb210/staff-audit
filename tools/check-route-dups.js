import fs from 'fs';
import path from 'path';
const boot=fs.readFileSync('server/boot.ts','utf8');
const re=/app\.use\([^,]+,\s*["']([^"']+)["']\s*\)/g;
const map=new Map();let m;
while((m=re.exec(boot))){const p=m[1];map.set(p,(map.get(p)||0)+1)}
const dups=[...map.entries()].filter(([p,c])=>c>1);
if(dups.length){console.log('DUP_ROUTES',dups);process.exitCode=0}else{console.log('NO_DUP_ROUTES')}