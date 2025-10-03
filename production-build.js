#!/usr/bin/env node

/**
 * Production Build Script
 * Builds client assets for production deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting production build process...');

try {
  // Clean any existing build
  if (fs.existsSync('dist')) {
    console.log('🧹 Cleaning existing dist folder...');
    fs.rmSync('dist', { recursive: true, force: true });
  }

  // Build client assets
  console.log('📦 Building client assets...');
  execSync('npm run build:client', { stdio: 'inherit' });

  // Verify build
  const distExists = fs.existsSync('dist/public');
  if (distExists) {
    console.log('✅ Client build completed successfully');
    console.log('📁 Build output:', fs.readdirSync('dist/public'));
  } else {
    throw new Error('Client build failed - no dist/public directory created');
  }

  console.log('🎉 Production build process completed!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('  1. Deploy using Replit Production Deployment');
  console.log('  2. Use build command: node production-build.js');
  console.log('  3. Use start command: NODE_ENV=production tsx server/index.ts');
  console.log('');
  
} catch (error) {
  console.error('❌ Production build failed:', error.message);
  process.exit(1);
}