/**
 * BULLETPROOF SYSTEM HEALTH CHECK ENDPOINTS
 * Disk-only verification system with no cloud dependencies
 */

import express from 'express';
import { promises as fs } from 'fs';
import { db } from '../db';
import { documents } from '../../shared/schema';
import { isNull, sql, eq } from 'drizzle-orm';

const router = express.Router();

/**
 * GET /api/bulletproof/health
 * Check system health - all documents must have physical files
 */
router.get('/health', async (req: any, res: any) => {
  try {
    // Get total document count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(documents);
    
    const totalCount = totalResult.count;
    
    // Get documents with missing file_path (orphaned DB records)
    const orphanedRecords = await db
      .select()
      .from(documents)
      .where(isNull(documents.filePath));
    
    // Check physical file existence for all documents
    const allDocuments = await db.select().from(documents);
    const missingFiles = [];
    
    for (const doc of allDocuments) {
      if (doc.filePath) {
        try {
          await fs.access(doc.filePath);
        } catch {
          missingFiles.push({
            id: doc.id,
            fileName: doc.fileName,
            filePath: doc.filePath
          });
        }
      }
    }
    
    const isHealthy = orphanedRecords.length === 0 && missingFiles.length === 0;
    
    res.json({
      status: isHealthy ? 'healthy' : 'degraded',
      total: totalCount,
      orphaned: orphanedRecords.length,
      missingFiles: missingFiles.length,
      details: {
        orphanedRecords: orphanedRecords.map(doc => ({
          id: doc.id,
          fileName: doc.fileName
        })),
        missingFiles
      }
    });
    
    console.log(`🏥 [HEALTH CHECK] Status: ${isHealthy ? 'HEALTHY' : 'DEGRADED'} - Total: ${totalCount}, Orphaned: ${orphanedRecords.length}, Missing: ${missingFiles.length}`);
    
  } catch (error: unknown) {
    console.error('❌ [HEALTH CHECK] Error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Health check failed'
    });
  }
});

/**
 * POST /api/bulletproof/audit
 * Run startup audit - remove orphaned DB records
 */
router.post('/audit', async (req: any, res: any) => {
  try {
    const docs = await db.select().from(documents);
    const orphanedRecords = [];
    const validFiles = [];
    
    for (const doc of docs) {
      if (!doc.filePath) {
        orphanedRecords.push(doc);
        continue;
      }
      
      try {
        await fs.access(doc.filePath);
        validFiles.push(doc);
      } catch {
        console.warn(`❌ Missing file: ${doc.fileName} (${doc.filePath})`);
        orphanedRecords.push(doc);
      }
    }
    
    // Remove orphaned records
    let removedCount = 0;
    for (const orphan of orphanedRecords) {
      await db.delete(documents).where(eq(documents.id, orphan.id));
      removedCount++;
      console.log(`🗑️ [AUDIT] Removed orphaned record: ${orphan.fileName}`);
    }
    
    res.json({
      status: 'completed',
      totalDocuments: docs.length,
      validFiles: validFiles.length,
      orphanedRecords: orphanedRecords.length,
      removedRecords: removedCount
    });
    
    console.log(`🔍 [STARTUP AUDIT] Completed - Valid: ${validFiles.length}, Removed: ${removedCount}`);
    
  } catch (error: unknown) {
    console.error('❌ [AUDIT] Error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Audit failed'
    });
  }
});

export default router;