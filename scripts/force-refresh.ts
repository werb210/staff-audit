import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Force Cache Refresh Script
 * Clears all Vite, build, and HMR caches to prevent ghost file resurrection
 * Run at server startup to ensure clean state
 */

console.log('🧼 Force Refresh: Clearing stale caches...');

const cacheDirs = [
  '.vite',
  'client/.vite', 
  'node_modules/.vite',
  '.turbo',
  'dist',
  'client/dist',
  '.next',
  '.cache'
];

const safeToDelete = (dir: string): boolean => {
  // Safety check: only delete known cache directories
  const safePaths = ['.vite', 'dist', '.turbo', '.next', '.cache'];
  return safePaths.some(safe => dir.includes(safe));
};

let cleared = 0;

for (const dir of cacheDirs) {
  if (fs.existsSync(dir) && safeToDelete(dir)) {
    try {
      execSync(`rm -rf "${dir}"`, { stdio: 'pipe' });
      console.log(`✅ Cleared: ${dir}`);
      cleared++;
    } catch (error) {
      // Skip if permission denied (Replit system files)
      if (error instanceof Error && !error.message.includes('forbidden')) {
        console.log(`⚠️ Could not clear: ${dir}`);
      }
    }
  }
}

// Clear package manager caches
try {
  execSync('npm cache clean --force', { stdio: 'pipe' });
  console.log('✅ Cleared: npm cache');
  cleared++;
} catch {
  // npm cache may not be available
}

console.log(`🎯 Force Refresh Complete: ${cleared} caches cleared`);
console.log('🛡️ System ready for clean build');

// Verify no ghost files exist
const ghostFiles = [
  'server/routes/lender-matching.ts',
  'client/src/pages/staff/lender-matching',
  'client/src/pages/staff-old'
];

for (const ghostFile of ghostFiles) {
  if (fs.existsSync(ghostFile)) {
    console.error(`❌ Ghost file still exists: ${ghostFile}`);
    process.exit(1);
  }
}

console.log('✅ Ghost file check passed');