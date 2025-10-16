const fs = require('fs');

if (!fs.existsSync('tsconfig.json')) {
  // Create new tsconfig
  const tsconfig = {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "Bundler",
      "resolveJsonModule": true,
      "esModuleInterop": true,
      "strict": true,
      "skipLibCheck": true,
      "types": ["node"]
    },
    "include": ["server", "src", "tests", "scripts"]
  };
  fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2));
  console.log('[OK] Created tsconfig.json');
} else {
  // Update existing
  const j = JSON.parse(fs.readFileSync('tsconfig.json','utf8'));
  j.compilerOptions = j.compilerOptions || {};
  j.compilerOptions.types = Array.from(new Set([...(j.compilerOptions.types||[]), 'node']));
  j.compilerOptions.module = j.compilerOptions.module || 'ESNext';
  j.compilerOptions.moduleResolution = j.compilerOptions.moduleResolution || 'Bundler';
  j.compilerOptions.target = j.compilerOptions.target || 'ES2022';
  j.compilerOptions.esModuleInterop = true;
  j.compilerOptions.skipLibCheck = true;
  fs.writeFileSync('tsconfig.json', JSON.stringify(j, null, 2));
  console.log('[OK] Updated tsconfig.json (Node types ensured)');
}