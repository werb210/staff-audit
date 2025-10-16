/**
 * 🚀 S3 DOCUMENT ROUTES
 * 
 * New routes for S3-based document preview and download
 * Replaces disk-based file operations with S3 streaming
 */

import { Router } from 'express';
import { streamDocumentFromS3 } from '../utils/s3DirectStorage';
import { db } from '../db.js';
import { documents } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * S3 Document Preview Route
 * Streams document directly from S3 for preview
 */
router.get('/:documentId/s3-preview', async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    
    console.log(`📥 [S3-PREVIEW] Retrieving document: ${documentId}`);
    
    // Get document metadata from database
    const [document] = await db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        storageKey: documents.storageKey,
        fileType: documents.fileType
      })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    
    if (!document) {
      console.error(`❌ [S3-PREVIEW] Document not found: ${documentId}`);
      return res.status(404).json({
        error: 'Document not found'
      });
    }
    
    if (!document.storageKey) {
      console.error(`❌ [S3-PREVIEW] No S3 key for document: ${documentId}`);
      return res.status(404).json({
        error: 'Document not stored in S3'
      });
    }
    
    // Stream document from S3
    const { stream, contentType, contentLength } = await streamDocumentFromS3(document.storageKey);
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
    res.setHeader('X-Document-Source', 'S3-Direct');
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    
    // Stream the file
    stream.pipe(res);
    
    console.log(`✅ [S3-PREVIEW] Document streamed: ${document.fileName}`);
    
  } catch (error: unknown) {
    console.error(`❌ [S3-PREVIEW] Error streaming document:`, error);
    res.status(500).json({
      error: 'Failed to stream document from S3',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * S3 Document Download Route
 * Streams document directly from S3 for download
 */
router.get('/:documentId/s3-download', async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    
    console.log(`📦 [S3-DOWNLOAD] Downloading document: ${documentId}`);
    
    // Get document metadata from database
    const [document] = await db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        storageKey: documents.storageKey,
        fileType: documents.fileType
      })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    
    if (!document) {
      console.error(`❌ [S3-DOWNLOAD] Document not found: ${documentId}`);
      return res.status(404).json({
        error: 'Document not found'
      });
    }
    
    if (!document.storageKey) {
      console.error(`❌ [S3-DOWNLOAD] No S3 key for document: ${documentId}`);
      return res.status(404).json({
        error: 'Document not stored in S3'
      });
    }
    
    // Stream document from S3
    const { stream, contentType, contentLength } = await streamDocumentFromS3(document.storageKey);
    
    // Set appropriate headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    res.setHeader('X-Document-Source', 'S3-Direct');
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    
    // Stream the file
    stream.pipe(res);
    
    console.log(`✅ [S3-DOWNLOAD] Document downloaded: ${document.fileName}`);
    
  } catch (error: unknown) {
    console.error(`❌ [S3-DOWNLOAD] Error downloading document:`, error);
    res.status(500).json({
      error: 'Failed to download document from S3',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Health check for S3 document system
 */
router.get('/s3-health', async (req: any, res: any) => {
  try {
    // Count documents with S3 storage keys
    const result = await db.execute(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(storage_key) as s3_documents,
        COUNT(CASE WHEN storage_key IS NULL THEN 1 END) as disk_only_documents
      FROM documents
    `);
    
    const stats = result.rows[0];
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      statistics: {
        totalDocuments: parseInt(stats.total_documents),
        s3Documents: parseInt(stats.s3_documents),
        diskOnlyDocuments: parseInt(stats.disk_only_documents)
      },
      s3Ready: true
    });
    
  } catch (error: unknown) {
    console.error(`❌ [S3-HEALTH] Health check failed:`, error);
    res.status(500).json({
      status: 'error',
      error: 'S3 health check failed',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

export default router;