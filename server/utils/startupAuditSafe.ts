/**
 * 🔍 SAFE STARTUP AUDIT - NO DELETION VERSION
 * Scans for missing files on server boot without deleting anything
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { documents } from '../../shared/schema';
import fs from 'fs/promises';
import { alertDataLoss } from './alertSystem';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const dbSql = neon(DATABASE_URL);
const db = drizzle(dbSql);

export async function runSafeStartupAudit(): Promise<void> {
  try {
    console.log('🔍 [STARTUP-AUDIT] Starting safe startup audit (read-only)...');
    
    // Get all documents from database
    const allDocs = await db.select().from(documents);
    console.log(`📊 [STARTUP-AUDIT] Found ${allDocs.length} documents in database`);
    
    let missingCount = 0;
    const missingDocs = [];
    
    for (const doc of allDocs) {
      if (doc.filePath) {
        try {
          await fs.access(doc.filePath);
          // File exists, continue
        } catch {
          // File is missing
          missingCount++;
          missingDocs.push({
            id: doc.id,
            fileName: doc.fileName,
            filePath: doc.filePath,
            applicationId: doc.applicationId
          });
          
          console.log(`❌ [STARTUP-AUDIT] MISSING: ${doc.fileName} (${doc.id})`);
          console.log(`   Expected path: ${doc.filePath}`);
          
          // Alert for each missing file
          await alertDataLoss({
            documentName: doc.fileName || 'Unknown',
            applicationId: doc.applicationId,
            error: `File missing on disk: ${doc.filePath}`,
            details: {
              documentId: doc.id,
              expectedPath: doc.filePath,
              detectedAt: 'server-startup'
            }
          });
        }
      }
    }
    
    if (missingCount > 0) {
      console.error(`🚨 [STARTUP-AUDIT] CRITICAL: ${missingCount} files are missing from disk`);
      console.error(`🚨 [STARTUP-AUDIT] This indicates data loss - check logs/alerts.log for details`);
      
      // Log summary to audit file
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp} | CRITICAL | STARTUP_AUDIT | Missing files detected: ${missingCount} out of ${allDocs.length} total documents\n`;
      await fs.appendFile('logs/upload-audit.log', logEntry).catch(console.error);
      
    } else {
      console.log(`✅ [STARTUP-AUDIT] All ${allDocs.length} documents present on disk`);
    }
    
  } catch (error: unknown) {
    console.error('❌ [STARTUP-AUDIT] Audit failed:', error);
    
    // Alert for audit failure
    await alertDataLoss({
      documentName: 'SYSTEM',
      applicationId: 'SYSTEM',
      error: `Startup audit failed: ${error}`,
      details: { error }
    });
  }
}