import { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Vite Plugin: Ghost File Detector
 * Prevents banned/ghost files from being included in builds
 * Blocks architecture drift at the build system level
 */
export function ghostGuardPlugin(): Plugin {
  return {
    name: 'vite:ghost-guard',
    enforce: 'pre',
    buildStart() {
      console.log('🔍 Ghost Guard: Scanning for banned files...');
      
      const forbiddenPaths = [
        'client/src/pages/staff/lender-matching',
        'client/src/routes/lender-matching',
        'client/src/components/lender-matching',
        'server/routes/lender-matching.ts',
        'server/routes/marketing.tsx',
        'client/src/pages/staff-old',
        'client/src/_graveyard'
      ];

      const forbiddenPatterns = [
        /lender-matching/i,
        /LenderMatching/,
        /staff-old/,
        /_graveyard/
      ];

      let violations = 0;

      // Check for forbidden directories and files
      for (const forbiddenPath of forbiddenPaths) {
        if (fs.existsSync(forbiddenPath)) {
          this.error(`❌ Ghost file/directory detected: ${forbiddenPath}`);
          violations++;
        }
      }

      // Scan key files for banned imports
      const keyFiles = [
        'client/src/app/nav.ts',
        'client/src/app/routes.tsx',
        'server/boot.ts'
      ];

      for (const file of keyFiles) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf-8');
          for (const pattern of forbiddenPatterns) {
            if (pattern.test(content) && !content.includes('// REMOVED:')) {
              this.warn(`⚠️ Potential ghost reference in ${file}: ${pattern}`);
            }
          }
        }
      }

      if (violations === 0) {
        console.log('✅ Ghost Guard: No violations detected');
      }
    },
    
    resolveId(id) {
      // Block resolution of banned modules
      if (id.includes('lender-matching') || id.includes('LenderMatching')) {
        this.error(`❌ Attempt to import banned module: ${id}`);
        return null;
      }
    }
  };
}