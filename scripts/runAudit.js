#!/usr/bin/env node

// Simple script runner for S3 weekly audit
// Usage: node scripts/runAudit.js

const { exec } = require('child_process');

console.log('🔍 Starting S3 Weekly Audit...');

exec('tsx scripts/s3WeeklyAudit.ts', (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Audit failed: ${error.message}`);
    process.exit(1);
  }
  
  if (stderr) {
    console.error(`⚠️ Audit warnings: ${stderr}`);
  }
  
  console.log(stdout);
  console.log('✅ S3 Weekly Audit completed successfully');
});