import fs from 'fs';
import path from 'path';

// Configuration
const ROOT = path.resolve(__dirname, '../client/src');
const PAGES_DIR = path.join(ROOT, 'pages');
const ROUTES_FILE = path.join(ROOT, 'app/routes.tsx');
const NAV_FILE = path.join(ROOT, 'app/nav.ts');

function walk(dir: string, ext = '.tsx'): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).flatMap(file => {
    const full = path.join(dir, file);
    return fs.statSync(full).isDirectory() ? walk(full, ext) : full.endsWith(ext) ? [full] : [];
  });
}

function findDuplicates(items: string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  items.forEach(i => {
    const name = path.basename(i);
    if (seen.has(name)) dups.add(name);
    else seen.add(name);
  });
  return Array.from(dups);
}

function checkNavRoutes() {
  if (!fs.existsSync(NAV_FILE) || !fs.existsSync(ROUTES_FILE)) {
    return { missing: [], extra: [], error: 'Nav or Routes file not found' };
  }

  const nav = fs.readFileSync(NAV_FILE, 'utf-8');
  const routes = fs.readFileSync(ROUTES_FILE, 'utf-8');

  // Extract paths from nav file (looking for 'to:' patterns)
  const navPaths = Array.from(nav.matchAll(/to:\s*['"`]([^'"`]*?)['"`]/g)).map(m => m[1]);
  // Extract paths from routes file (looking for 'path=' patterns)
  const routePaths = Array.from(routes.matchAll(/path=['"`]([^'"`]*?)['"`]/g)).map(m => m[1]);

  const missing = navPaths.filter(p => !routePaths.some(r => r.includes(p.replace('/staff/', ''))));
  const extra = routePaths.filter(p => !navPaths.some(n => n.includes(p)) && !p.includes('*') && p !== '/');

  return { missing, extra };
}

function checkComponentDuplicates(files: string[]): string[] {
  const components: string[] = [];
  
  files.forEach(file => {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf-8');
    
    // Find function components
    const functionMatches = content.match(/(?:export\s+default\s+)?function\s+([A-Z]\w*)/g);
    if (functionMatches) {
      functionMatches.forEach(match => {
        const name = match.replace(/export\s+default\s+function\s+/, '').replace(/function\s+/, '');
        components.push(name);
      });
    }
    
    // Find arrow function components
    const arrowMatches = content.match(/(?:export\s+)?(?:const|let)\s+([A-Z]\w*)\s*[:=]\s*(?:\([^)]*\)\s*=>\s*{|\([^)]*\)\s*=>\s*\()/g);
    if (arrowMatches) {
      arrowMatches.forEach(match => {
        const nameMatch = match.match(/(?:const|let)\s+([A-Z]\w*)/);
        if (nameMatch) components.push(nameMatch[1]);
      });
    }
  });
  
  return findDuplicates(components);
}

// === RUN TESTS ===
console.log('🔍 Running Staff App Integrity Test...\n');

// 1. Check duplicate files
const files = walk(PAGES_DIR);
console.log(`📁 Found ${files.length} component files`);

const duplicates = findDuplicates(files);
if (duplicates.length) {
  console.error('❌ Duplicate files found:\n', duplicates.join('\n'));
} else {
  console.log('✅ No duplicate files found');
}

// 2. Check nav vs routes
const { missing, extra, error } = checkNavRoutes();
if (error) {
  console.error(`⚠️ ${error}`);
} else {
  if (missing.length) {
    console.error('\n❌ Nav items missing routes:\n', missing.join('\n'));
  }
  if (extra.length) {
    console.error('\n⚠️ Route paths not linked in Nav:\n', extra.join('\n'));
  }
  if (!missing.length && !extra.length) {
    console.log('✅ Nav and Routes are in sync');
  }
}

// 3. Check for component duplicates
const dupComponents = checkComponentDuplicates(files);
if (dupComponents.length) {
  console.error('\n❌ Duplicate React components found:\n', dupComponents.join('\n'));
} else {
  console.log('✅ No duplicate component definitions');
}

// 4. Check for proper imports and exports
let importIssues = 0;
files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf-8');
  const relativePath = path.relative(ROOT, file);
  
  // Check for proper default export
  if (!content.includes('export default') && !content.includes('export {')) {
    console.error(`⚠️ ${relativePath}: No default export found`);
    importIssues++;
  }
});

if (importIssues === 0) {
  console.log('✅ All components have proper exports');
} else {
  console.error(`❌ Found ${importIssues} components with export issues`);
}

// 5. Check specific Staff App pages exist
const requiredPages = [
  'pipeline/PipelinePage.tsx',
  'contacts/ContactsPage.tsx', 
  'lenders/LendersPage.tsx',
  'documents/DocumentsPage.tsx',
  'communications/ChatPage.tsx',
  'communications/EmailPage.tsx',
  'communications/CallLogPage.tsx',
  'calendar/CalendarPage.tsx',
  'marketing/MarketingPage.tsx',
  'reports/ReportsPage.tsx',
  'settings/SettingsPage.tsx'
];

const missingPages = requiredPages.filter(page => {
  const fullPath = path.join(PAGES_DIR, 'staff', page);
  return !fs.existsSync(fullPath);
});

if (missingPages.length) {
  console.error('\n❌ Missing required Staff App pages:\n', missingPages.join('\n'));
} else {
  console.log('✅ All required Staff App pages exist');
}

console.log('\n🎉 Staff App Integrity Test Complete.');