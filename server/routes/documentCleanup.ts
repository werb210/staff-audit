import express from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../db/index';
import { documents } from '../../shared/schema';
import { sql } from 'drizzle-orm';

const router = express.Router();

// POST /api/document-cleanup/remove-all - Remove ALL documents from system
router.post('/remove-all', async (req: any, res: any) => {
  try {
    console.log('🗑️ [DOCUMENT CLEANUP] Starting complete document removal process');
    
    // Get all document records first for logging
    const allDocuments = await db.select().from(documents);
    const totalDocuments = allDocuments.length;
    
    console.log(`📊 [DOCUMENT CLEANUP] Found ${totalDocuments} documents in database`);
    
    let filesDeleted = 0;
    let filesNotFound = 0;
    
    // Delete physical files
    for (const doc of allDocuments) {
      const filePath = path.resolve(doc.file_path);
      
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          filesDeleted++;
          console.log(`✅ [DOCUMENT CLEANUP] Deleted file: ${doc.fileName}`);
        } else {
          filesNotFound++;
          console.log(`⚠️ [DOCUMENT CLEANUP] File not found: ${doc.fileName}`);
        }
      } catch (error: unknown) {
        console.error(`❌ [DOCUMENT CLEANUP] Error deleting file ${doc.fileName}:`, error);
      }
    }
    
    // Delete all document database records
    const deleteResult = await db.delete(documents);
    const recordsDeleted = totalDocuments; // We know how many we're deleting
    
    console.log(`✅ [DOCUMENT CLEANUP] Deleted ${recordsDeleted} database records`);
    
    // Clean up any remaining files in uploads directory
    const uploadsDir = path.resolve('uploads/documents');
    let orphanedFiles = 0;
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        try {
          fs.unlinkSync(filePath);
          orphanedFiles++;
          console.log(`🧹 [DOCUMENT CLEANUP] Removed orphaned file: ${file}`);
        } catch (error: unknown) {
          console.error(`❌ [DOCUMENT CLEANUP] Error removing orphaned file ${file}:`, error);
        }
      }
    }
    
    // Clear related document data
    await db.execute(sql`DELETE FROM document_versions`);
    await db.execute(sql`DELETE FROM document_recovery_log`);
    await db.execute(sql`DELETE FROM upload_retry_queue`);
    
    console.log('✅ [DOCUMENT CLEANUP] Cleared all related document tables');
    
    const summary = {
      totalDocumentsInDatabase: totalDocuments,
      databaseRecordsDeleted: recordsDeleted,
      physicalFilesDeleted: filesDeleted,
      filesNotFound: filesNotFound,
      orphanedFilesRemoved: orphanedFiles,
      status: 'complete',
      message: 'All documents successfully removed from system'
    };
    
    console.log('🎯 [DOCUMENT CLEANUP] Complete removal summary:', summary);
    
    res.json(summary);
    
  } catch (error: unknown) {
    console.error('❌ [DOCUMENT CLEANUP] Error during complete removal:', error);
    res.status(500).json({ 
      error: 'Document cleanup failed', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// GET /api/document-cleanup/status - Get current document count
router.get('/status', async (req: any, res: any) => {
  try {
    const allDocuments = await db.select().from(documents);
    const databaseCount = allDocuments.length;
    
    const uploadsDir = path.resolve('uploads/documents');
    let physicalCount = 0;
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      physicalCount = files.length;
    }
    
    res.json({
      databaseDocuments: databaseCount,
      physicalFiles: physicalCount,
      uploadsDirectory: uploadsDir
    });
    
  } catch (error: unknown) {
    console.error('❌ [DOCUMENT CLEANUP] Error getting status:', error);
    res.status(500).json({ error: 'Status check failed' });
  }
});

export default router;