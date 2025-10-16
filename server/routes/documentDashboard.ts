import express, { Request, Response } from 'express';
import { db } from '../db.ts';
import { documents } from '../../shared/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { eq, desc, count, sql } from 'drizzle-orm';

const router = express.Router();

// Enhanced document dashboard with SHA256 indicators and file size stats
router.get('/enhanced-status', async (req: any, res: Response) => {
  try {
    // Get document statistics with SHA256 and size info
    const documentStats = await db.select({
      totalDocuments: count(),
      withChecksums: sql<number>`COUNT(CASE WHEN checksum IS NOT NULL AND checksum != '' THEN 1 END)`,
      withStorageKeys: sql<number>`COUNT(CASE WHEN storage_key IS NOT NULL AND storage_key != '' THEN 1 END)`,
      totalSize: sql<number>`COALESCE(SUM(file_size), 0)`,
      avgSize: sql<number>`COALESCE(AVG(file_size), 0)`,
      recentUploads: sql<number>`COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END)`
    }).from(documents);

    // Get documents by category with enhancement indicators
    const documentsByCategory = await db.select({
      documentType: documents.documentType,
      count: count(),
      withChecksums: sql<number>`COUNT(CASE WHEN checksum IS NOT NULL AND checksum != '' THEN 1 END)`,
      avgSize: sql<number>`COALESCE(AVG(file_size), 0)`,
      totalSize: sql<number>`COALESCE(SUM(file_size), 0)`
    })
    .from(documents)
    .groupBy(documents.documentType)
    .orderBy(desc(count()));

    // Get recent documents with full enhancement data
    const recentDocuments = await db.select({
      id: documents.id,
      fileName: documents.fileName,
      documentType: documents.documentType,
      fileSize: documents.fileSize,
      checksum: documents.checksum,
      storageKey: documents.storageKey,
      createdAt: documents.createdAt,
      hasChecksum: sql<boolean>`checksum IS NOT NULL AND checksum != ''`,
      hasStorageBackup: sql<boolean>`storage_key IS NOT NULL AND storage_key != ''`,
      enhancementLevel: sql<string>`
        CASE 
          WHEN checksum IS NOT NULL AND storage_key IS NOT NULL THEN 'FULLY_ENHANCED'
          WHEN checksum IS NOT NULL THEN 'CHECKSUM_ONLY'
          WHEN storage_key IS NOT NULL THEN 'BACKUP_ONLY'
          ELSE 'BASIC'
        END
      `
    })
    .from(documents)
    .orderBy(desc(documents.createdAt))
    .limit(20);

    res.json({
      stats: documentStats[0],
      categoryBreakdown: documentsByCategory,
      recentDocuments,
      enhancementSummary: {
        fullyEnhanced: recentDocuments.filter(d => d.enhancementLevel === 'FULLY_ENHANCED').length,
        checksumOnly: recentDocuments.filter(d => d.enhancementLevel === 'CHECKSUM_ONLY').length,
        backupOnly: recentDocuments.filter(d => d.enhancementLevel === 'BACKUP_ONLY').length,
        basic: recentDocuments.filter(d => d.enhancementLevel === 'BASIC').length
      },
      message: 'Enhanced document dashboard data retrieved successfully'
    });

  } catch (error: unknown) {
    console.error('❌ [DASHBOARD] Failed to get enhanced status:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
});

// Document health report with integrity verification
router.get('/health-report', async (req: any, res: Response) => {
  try {
    const healthReport = {
      timestamp: new Date().toISOString(),
      systemStatus: 'OPERATIONAL',
      metrics: {
        totalDocuments: 0,
        integrityVerified: 0,
        backupProtected: 0,
        needsAttention: 0
      },
      alerts: [] as string[]
    };

    // Get all documents for health check
    const allDocs = await db.select().from(documents);
    healthReport.metrics.totalDocuments = allDocs.length;

    allDocs.forEach(doc => {
      if (doc.checksum) {
        healthReport.metrics.integrityVerified++;
      }
      if (doc.storageKey) {
        healthReport.metrics.backupProtected++;
      }
      if (!doc.checksum && !doc.storageKey) {
        healthReport.metrics.needsAttention++;
      }
    });

    // Generate alerts
    const checksumCoverage = (healthReport.metrics.integrityVerified / healthReport.metrics.totalDocuments) * 100;
    const backupCoverage = (healthReport.metrics.backupProtected / healthReport.metrics.totalDocuments) * 100;

    if (checksumCoverage < 50) {
      healthReport.alerts.push(`LOW_CHECKSUM_COVERAGE: Only ${checksumCoverage.toFixed(1)}% of documents have integrity verification`);
    }
    if (backupCoverage < 30) {
      healthReport.alerts.push(`LOW_BACKUP_COVERAGE: Only ${backupCoverage.toFixed(1)}% of documents have backup protection`);
    }
    if (healthReport.metrics.needsAttention > 10) {
      healthReport.alerts.push(`ATTENTION_NEEDED: ${healthReport.metrics.needsAttention} documents lack both checksum and backup`);
    }

    res.json(healthReport);

  } catch (error: unknown) {
    console.error('❌ [DASHBOARD] Failed to generate health report:', error);
    res.status(500).json({ error: 'Failed to generate health report' });
  }
});

export default router;