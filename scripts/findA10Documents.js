#!/usr/bin/env node

/**
 * Emergency script to find the missing A10 application documents
 * Searches file system and logs for any trace of the 6 bank statements
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚨 EMERGENCY A10 DOCUMENT SEARCH');
console.log('================================');

const A10_APP_ID = '9c256e01-9f98-4637-bb86-3f824a7c7837';
const A10_SUBMISSION_TIME = '2025-07-25 15:58:07';

// Search all possible upload directories
const searchDirs = [
  './uploads',
  './uploads/documents', 
  './uploads/temp',
  './tmp',
  './cache',
  './'
];

console.log('\n📁 SEARCHING FILE SYSTEM...');

let filesFound = 0;

for (const dir of searchDirs) {
  if (fs.existsSync(dir)) {
    console.log(`\n🔍 Searching: ${dir}`);
    
    try {
      const files = fs.readdirSync(dir, { recursive: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        
        // Check if it's a file (not directory)
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          const fileName = path.basename(file);
          const stats = fs.statSync(fullPath);
          
          // Look for files created around A10 submission time
          const fileTime = stats.mtime.toISOString();
          const isNearA10Time = fileTime.includes('2025-07-25') && 
                               (fileTime >= '2025-07-25T15:30:00' && fileTime <= '2025-07-25T16:30:00');
          
          // Look for files with A10 in name or UUID patterns
          const hasA10Pattern = fileName.includes('A10') || 
                               fileName.includes('9c256e01') ||
                               fileName.includes('bank') ||
                               /^[a-f0-9\-]{36}/.test(fileName);
          
          if (isNearA10Time || hasA10Pattern) {
            console.log(`  📄 POTENTIAL MATCH: ${fullPath}`);
            console.log(`     Size: ${stats.size} bytes`);
            console.log(`     Modified: ${fileTime}`);
            console.log(`     Pattern Match: ${hasA10Pattern ? 'YES' : 'TIME-BASED'}`);
            filesFound++;
          }
        }
      }
    } catch (error) {
      console.log(`  ❌ Error reading ${dir}: ${error.message}`);
    }
  } else {
    console.log(`  ⚠️  Directory not found: ${dir}`);
  }
}

console.log('\n📋 SEARCHING LOGS AND SYSTEM FILES...');

// Search for A10 in log files
try {
  console.log('\n🔍 Searching for A10 application logs...');
  const grepResult = execSync(`find . -name "*.log" -type f -exec grep -l "${A10_APP_ID}\\|A10" {} \\; 2>/dev/null || echo "No log matches found"`).toString();
  
  if (grepResult.trim() !== "No log matches found") {
    console.log('📄 Log files with A10 references:');
    console.log(grepResult);
  } else {
    console.log('⚠️  No logs found containing A10 references');
  }
} catch (error) {
  console.log(`❌ Log search failed: ${error.message}`);
}

// Search for recent uploads in system 
try {
  console.log('\n🔍 Searching for recent document uploads...');
  const recentFiles = execSync(`find . -type f -name "*" -newermt "2025-07-25 15:30" 2>/dev/null | grep -v node_modules | grep -v .git | head -20`).toString();
  
  if (recentFiles.trim()) {
    console.log('📄 Recent files (after A10 submission):');
    console.log(recentFiles);
  } else {
    console.log('⚠️  No recent files found after A10 submission time');
  }
} catch (error) {
  console.log(`❌ Recent files search failed: ${error.message}`);
}

console.log('\n📊 SEARCH SUMMARY');
console.log('================');
console.log(`Files Found: ${filesFound}`);
console.log(`A10 App ID: ${A10_APP_ID}`);
console.log(`Submission Time: ${A10_SUBMISSION_TIME}`);

if (filesFound === 0) {
  console.log('\n🚨 CRITICAL: NO A10 DOCUMENTS FOUND');
  console.log('This confirms complete data loss - the 6 bank statements are missing from the file system');
} else {
  console.log(`\n✅ Found ${filesFound} potential document(s) - investigating above files for A10 content`);
}

console.log('\n🎯 NEXT STEPS:');
console.log('1. Check database for any A10 document records');
console.log('2. Review upload endpoint logs for A10 submission');
console.log('3. Check if documents were uploaded to S3 instead of local disk');
console.log('4. Investigate upload endpoint routing conflicts');