// Health Check Endpoint for Diagnostic Tests
import express from 'express';
import { db } from '../db';
import { applications, documents } from '../../shared/schema';
import { count, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Health check endpoint for bulletproof system validation
router.get('/health', async (req: any, res: any) => {
  try {
    console.log('🔍 [HEALTH CHECK] Starting comprehensive system validation...');
    
    const healthStatus = {
      status: 'operational',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'unknown',
        uploadSystem: 'unknown',
        storageSystem: 'unknown',
        backupSystem: 'unknown'
      },
      metrics: {
        applicationCount: 0,
        documentCount: 0,
        uploadDirectory: 'unknown'
      }
    };

    // 1. Database connectivity test
    try {
      const [appResult] = await db.select({ count: count() }).from(applications);
      const [docResult] = await db.select({ count: count() }).from(documents);
      
      healthStatus.checks.database = 'operational';
      healthStatus.metrics.applicationCount = appResult.count;
      healthStatus.metrics.documentCount = docResult.count;
      
      console.log(`✅ [HEALTH] Database: ${appResult.count} applications, ${docResult.count} documents`);
    } catch (dbError) {
      console.error('❌ [HEALTH] Database check failed:', dbError);
      healthStatus.checks.database = 'error';
      healthStatus.status = 'degraded';
    }

    // 2. Upload system validation
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
      const dirExists = fs.existsSync(uploadsDir);
      
      if (dirExists) {
        const stats = fs.statSync(uploadsDir);
        if (stats.isDirectory()) {
          // Check write permissions by attempting to create a test file
          const testFile = path.join(uploadsDir, '.health-check-test');
          try {
            fs.writeFileSync(testFile, 'health check test');
            fs.unlinkSync(testFile); // Clean up
            healthStatus.checks.uploadSystem = 'operational';
            healthStatus.metrics.uploadDirectory = 'writable';
            console.log('✅ [HEALTH] Upload system: Directory writable');
          } catch (writeError) {
            healthStatus.checks.uploadSystem = 'readonly';
            healthStatus.metrics.uploadDirectory = 'readonly';
            console.warn('⚠️ [HEALTH] Upload system: Directory not writable');
          }
        } else {
          healthStatus.checks.uploadSystem = 'error';
          healthStatus.metrics.uploadDirectory = 'not_directory';
        }
      } else {
        // Try to create the directory
        try {
          fs.mkdirSync(uploadsDir, { recursive: true });
          healthStatus.checks.uploadSystem = 'operational';
          healthStatus.metrics.uploadDirectory = 'created';
          console.log('✅ [HEALTH] Upload system: Directory created');
        } catch (createError) {
          healthStatus.checks.uploadSystem = 'error';
          healthStatus.metrics.uploadDirectory = 'creation_failed';
          console.error('❌ [HEALTH] Upload system: Cannot create directory');
        }
      }
    } catch (uploadError) {
      console.error('❌ [HEALTH] Upload system check failed:', uploadError);
      healthStatus.checks.uploadSystem = 'error';
      healthStatus.status = 'degraded';
    }

    // 3. Storage system validation (S3 integration check)
    try {
      // Check if S3 configuration is available
      const hasS3Config = process.env.AWS_ACCESS_KEY_ID && 
                         process.env.AWS_SECRET_ACCESS_KEY && 
                         process.env.AWS_REGION;
      
      if (hasS3Config) {
        healthStatus.checks.storageSystem = 'operational';
        console.log('✅ [HEALTH] Storage system: S3 configuration available');
      } else {
        healthStatus.checks.storageSystem = 'local_only';
        console.log('⚠️ [HEALTH] Storage system: Local storage only (S3 not configured)');
      }
    } catch (storageError) {
      console.error('❌ [HEALTH] Storage system check failed:', storageError);
      healthStatus.checks.storageSystem = 'error';
    }

    // 4. Backup system validation
    try {
      // Check if backup tables exist in database
      const backupTables = [
        'backup_applications_20250125',
        'backup_documents_20250125', 
        'backup_users_20250125'
      ];
      
      let backupTablesFound = 0;
      for (const tableName of backupTables) {
        try {
          const result = await db.execute(sql`SELECT 1 FROM ${sql.identifier(tableName)} LIMIT 1`);
          backupTablesFound++;
        } catch {
          // Table doesn't exist, continue
        }
      }
      
      if (backupTablesFound === backupTables.length) {
        healthStatus.checks.backupSystem = 'healthy';
        console.log('✅ [HEALTH] Backup system: All backup tables present');
      } else if (backupTablesFound > 0) {
        healthStatus.checks.backupSystem = 'partial';
        console.log(`⚠️ [HEALTH] Backup system: ${backupTablesFound}/${backupTables.length} backup tables found`);
      } else {
        healthStatus.checks.backupSystem = 'none';
        console.log('⚠️ [HEALTH] Backup system: No backup tables found');
      }
    } catch (backupError) {
      console.error('❌ [HEALTH] Backup system check failed:', backupError);
      healthStatus.checks.backupSystem = 'error';
    }

    // Overall system status determination
    const failedChecks = Object.values(healthStatus.checks).filter(status => 
      status === 'error' || status === 'unknown'
    ).length;
    
    if (failedChecks === 0) {
      healthStatus.status = 'operational';
    } else if (failedChecks <= 1) {
      healthStatus.status = 'degraded';
    } else {
      healthStatus.status = 'error';
    }

    console.log(`🔍 [HEALTH CHECK] Complete - Status: ${healthStatus.status}`);
    
    // Return health status with appropriate HTTP code
    const statusCode = healthStatus.status === 'operational' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    return res.status(statusCode).json(healthStatus);

  } catch (error: unknown) {
    console.error('❌ [HEALTH] Critical health check failure:', error);
    return res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check system failure',
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

export default router;