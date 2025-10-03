/**
 * Admin Upload Dashboard Routes
 * Health monitoring and metrics for upload system
 */

import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// Upload metrics and statistics
router.get('/metrics', async (req: any, res: any) => {
  try {
    console.log('📊 [ADMIN] Fetching upload metrics');

    // Get upload statistics
    const uploadStats = await db.execute(sql`
      SELECT 
        status,
        COUNT(*) as count,
        MIN(created_at) as first_attempt,
        MAX(created_at) as last_attempt
      FROM document_upload_log
      GROUP BY status
      ORDER BY 
        CASE status 
          WHEN 'success' THEN 1
          WHEN 'fallback' THEN 2  
          WHEN 'failure' THEN 3
        END
    `);

    // Get document storage status
    const storageStats = await db.execute(sql`
      SELECT 
        storage_status,
        COUNT(*) as count
      FROM documents
      WHERE storage_status IS NOT NULL
      GROUP BY storage_status
      ORDER BY count DESC
    `);

    // Get recent upload activity (last 24 hours)
    const recentActivity = await db.execute(sql`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        status,
        COUNT(*) as count
      FROM document_upload_log
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', created_at), status
      ORDER BY hour DESC
    `);

    // Get fallback documents needing retry
    const fallbackDocs = await db.execute(sql`
      SELECT 
        d.id,
        d.application_id,
        d.file_name,
        d.file_size,
        d.created_at,
        d.file_path,
        CASE WHEN d.file_path IS NOT NULL THEN 'file_exists' ELSE 'file_missing' END as file_status
      FROM documents d
      WHERE d.storage_status = 'fallback'
      ORDER BY d.created_at DESC
      LIMIT 50
    `);

    // Calculate metrics
    const totalUploads = uploadStats.rows.reduce((sum: number, stat: any) => sum + parseInt(stat.count), 0);
    const successCount = uploadStats.rows.find((stat: any) => stat.status === 'success')?.count || 0;
    const fallbackCount = uploadStats.rows.find((stat: any) => stat.status === 'fallback')?.count || 0;
    const failureCount = uploadStats.rows.find((stat: any) => stat.status === 'failure')?.count || 0;

    const fallbackFilesExist = fallbackDocs.rows.filter((doc: any) => doc.file_status === 'file_exists').length;
    const pendingRetry = fallbackFilesExist;

    res.json({
      success: true,
      metrics: {
        totalUploads,
        s3Success: successCount,
        fallbacks: fallbackCount,
        pendingRetry,
        failed: failureCount,
        successRate: totalUploads > 0 ? Math.round((successCount / totalUploads) * 100) : 0,
      },
      uploadStatistics: uploadStats.rows,
      storageStatistics: storageStats.rows,
      recentActivity: recentActivity.rows,
      fallbackDocuments: fallbackDocs.rows,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to fetch upload metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upload metrics',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Health check endpoint
router.get('/health', async (req: any, res: any) => {
  try {
    console.log('🏥 [ADMIN] Health check requested');

    // Check database connectivity
    const dbTest = await db.execute(sql`SELECT COUNT(*) as count FROM documents LIMIT 1`);
    const dbConnected = !!dbTest.rows[0];

    // Check S3 connectivity (basic)
    let s3Connected = false;
    try {
      const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3');
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'ca-central-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      
      const bucketName = process.env.AWS_S3_BUCKET_NAME || 'boreal-production-uploads';
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      s3Connected = true;
    } catch (s3Error) {
      console.warn('⚠️ [ADMIN] S3 health check failed:', (s3Error as any).message);
    }

    // Check recent upload activity
    const recentUploads = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM document_upload_log
      WHERE created_at >= NOW() - INTERVAL '1 hour'
    `);

    const recentUploadCount = parseInt(recentUploads.rows[0]?.count || '0');

    // Calculate overall health score
    let healthScore = 0;
    if (dbConnected) healthScore += 40;
    if (s3Connected) healthScore += 40;
    if (recentUploadCount > 0) healthScore += 20;

    const healthStatus = healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'degraded' : 'unhealthy';

    res.json({
      success: true,
      health: {
        status: healthStatus,
        score: healthScore,
        checks: {
          database: dbConnected,
          s3Storage: s3Connected,
          recentActivity: recentUploadCount > 0,
        },
        details: {
          databaseConnected: dbConnected,
          s3Connected,
          recentUploadsLastHour: recentUploadCount,
        },
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('❌ [ADMIN] Health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Retry specific fallback upload
router.post('/retry-upload/:documentId', async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    console.log(`🔄 [ADMIN] Retry upload requested for: ${documentId}`);

    // Get document details
    const doc = await db.execute(sql`
      SELECT id, application_id, file_name, file_path, storage_status
      FROM documents
      WHERE id = ${documentId} AND storage_status = 'fallback'
    `);

    if (doc.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found or not in fallback status',
      });
    }

    // Import and use recovery service
    const { FallbackRecoveryService } = await import('../../scripts/retry_fallback_uploads.js');
    const recovery = new FallbackRecoveryService();
    const result = await recovery.retryFallbackUpload(doc.rows[0] as any);

    if (result.success) {
      res.json({
        success: true,
        message: 'Document successfully uploaded to S3',
        documentId,
        newStorageKey: result.newStorageKey,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to retry upload',
        details: result.error,
      });
    }

  } catch (error: any) {
    console.error('❌ [ADMIN] Retry upload failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry upload',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Batch retry all fallback uploads
router.post('/retry-all-fallbacks', async (req: any, res: any) => {
  try {
    console.log('🔄 [ADMIN] Batch retry all fallbacks requested');

    // Import recovery function
    const { retryFallbackUploads } = await import('../../scripts/retry_fallback_uploads.js');
    
    // Run recovery in background (don't wait for completion)
    retryFallbackUploads()
      .then(() => {
        console.log('✅ [ADMIN] Batch retry completed successfully');
      })
      .catch((error) => {
        console.error('❌ [ADMIN] Batch retry failed:', error);
      });

    res.json({
      success: true,
      message: 'Batch retry process started in background',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to start batch retry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start batch retry',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Generate audit report
router.get('/audit-report', async (req: any, res: any) => {
  try {
    console.log('📋 [ADMIN] Audit report requested');

    // Import audit function
    const { auditFallbackUploads } = await import('../../scripts/audit_fallback_uploads.js');
    
    // This would generate the report and return summary
    // For API response, we'll return key metrics
    const metrics = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM documents WHERE storage_status = 'fallback') as fallback_count,
        (SELECT COUNT(*) FROM documents WHERE storage_status = 'success') as success_count,
        (SELECT COUNT(*) FROM document_upload_log WHERE status = 'failure') as failure_count,
        (SELECT MAX(created_at) FROM document_upload_log) as last_upload
    `);

    res.json({
      success: true,
      auditSummary: {
        fallbackDocuments: metrics.rows[0]?.fallback_count || 0,
        successfulDocuments: metrics.rows[0]?.success_count || 0,
        failedUploads: metrics.rows[0]?.failure_count || 0,
        lastUploadTime: metrics.rows[0]?.last_upload,
      },
      message: 'Run "npx tsx scripts/audit_fallback_uploads.ts" for detailed report',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ [ADMIN] Audit report failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate audit report',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;