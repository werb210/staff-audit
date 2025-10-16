#!/usr/bin/env node

/**
 * CLEAN CONSOLE LOGS SCRIPT
 * Removes unnecessary console statements while preserving critical ones
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientDir = path.join(__dirname, '../client/src');

function findTsxFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(itemPath);
      } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
        files.push(itemPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function cleanConsoleInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let newLines = [];
  let removedCount = 0;
  
  for (const line of lines) {
    // Preserve critical console statements
    if (line.includes('console.error') && line.includes('error')) {
      newLines.push(line);
      continue;
    }
    
    if (line.includes('console.warn') && (line.includes('TODO') || line.includes('handler not implemented'))) {
      newLines.push(line);
      continue;
    }
    
    // Remove debug console statements
    if (line.match(/console\.(log|warn|info|debug)/)) {
      removedCount++;
      continue;
    }
    
    newLines.push(line);
  }
  
  if (removedCount > 0) {
    fs.writeFileSync(filePath, newLines.join('\n'));
    console.log(`✅ Removed ${removedCount} console statements from: ${path.relative(clientDir, filePath)}`);
    return removedCount;
  }
  
  return 0;
}

function main() {
  console.log('🧹 CLEANING CONSOLE LOGS...');
  
  const tsxFiles = findTsxFiles(clientDir);
  let totalRemoved = 0;
  
  for (const file of tsxFiles) {
    totalRemoved += cleanConsoleInFile(file);
  }
  
  console.log(`✅ Removed ${totalRemoved} total console statements`);
}

main();