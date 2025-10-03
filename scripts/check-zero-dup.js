#!/usr/bin/env node

// Zero-dup linter: auto-fail if duplicates or absolute API URLs appear
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

console.log('🔍 Checking for duplicate routes and absolute API URLs...');

// 1. Check for absolute API URLs in frontend code
const frontendFiles = glob.sync('client/src/**/*.{ts,tsx,js,jsx}');
let absoluteUrlFound = false;

frontendFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    // Check for replit.com or other absolute domains in API calls
    if (line.includes('replit.com') || line.includes('https://') && (line.includes('fetch') || line.includes('apiGet') || line.includes('apiPost'))) {
      console.log(`❌ ABSOLUTE URL FOUND: ${file}:${idx + 1}`);
      console.log(`   ${line.trim()}`);
      absoluteUrlFound = true;
    }
  });
});

// 2. Check for duplicate pipeline router mounts in server
const serverFiles = glob.sync('server/**/*.{ts,js,mjs}');
let routerMounts = [];

serverFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    if (line.includes('app.use') && line.includes('/api/pipeline')) {
      routerMounts.push(`${file}:${idx + 1} - ${line.trim()}`);
    }
  });
});

console.log(`Found ${routerMounts.length} pipeline router mounts:`);
routerMounts.forEach(mount => console.log(`  ${mount}`));

if (routerMounts.length > 1) {
  console.log('❌ DUPLICATE PIPELINE ROUTER MOUNTS FOUND!');
  process.exit(1);
}

if (absoluteUrlFound) {
  console.log('❌ ABSOLUTE API URLS FOUND!');
  process.exit(1);
}

console.log('✅ Zero-dup check passed: no duplicates or absolute URLs found');
process.exit(0);