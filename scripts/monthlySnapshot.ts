#!/usr/bin/env node

/**
 * Monthly Snapshot Cronjob
 * 
 * This script should be run monthly (e.g., via cron) to create
 * ZIP snapshots of all application documents for compliance.
 * 
 * Usage:
 *   npm run backup:monthly
 *   OR
 *   node scripts/monthlySnapshot.js
 * 
 * Cron example (1st day of each month at 2 AM):
 *   0 2 1 * * /usr/bin/node /path/to/scripts/monthlySnapshot.js
 */

import { backupService } from '../server/services/backupService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMonthlySnapshot() {
  console.log('='.repeat(60));
  console.log('🗂️  MONTHLY BACKUP SNAPSHOT STARTING');
  console.log('='.repeat(60));
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 S3 Bucket: ${process.env.S3_BUCKET_NAME || 'boreal-documents'}`);
  console.log('');

  const startTime = Date.now();

  try {
    // Run the monthly snapshot
    await backupService.createMonthlySnapshot();
    
    const duration = Date.now() - startTime;
    const durationMinutes = Math.round(duration / 60000);
    
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ MONTHLY BACKUP SNAPSHOT COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`⏱️  Total Duration: ${durationMinutes} minutes`);
    console.log(`📊 Check admin dashboard for detailed results`);
    console.log('');
    
    process.exit(0);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const durationMinutes = Math.round(duration / 60000);
    
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ MONTHLY BACKUP SNAPSHOT FAILED');
    console.error('='.repeat(60));
    console.error(`⏱️  Duration Before Failure: ${durationMinutes} minutes`);
    console.error(`🔥 Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('📊 Check logs and admin dashboard for details');
    console.error('');
    
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Handle process signals for graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Received SIGINT. Shutting down gracefully...');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Received SIGTERM. Shutting down gracefully...');
  process.exit(143);
});

// Run the backup if this script is executed directly
if (require.main === module) {
  runMonthlySnapshot();
}

export { runMonthlySnapshot };