/**
 * Automatic Document Processing Routes
 * Provides endpoints for managing automatic document processing
 */

import { Router } from 'express';
import { processDocument, processApplicationDocuments } from '../middleware/autoDocumentProcessor';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

/**
 * POST /api/auto-documents/process/:documentId
 * Manually trigger processing for a specific document
 */
router.post('/process/:documentId', async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    
    console.log(`🔄 [AUTO-DOCS] Manual processing requested for document: ${documentId}`);
    
    // Get document details
    const documentResult = await db.execute(sql`
      SELECT id, name, document_type, applicationId
      FROM documents 
      WHERE id = ${documentId}
      LIMIT 1
    `);
    
    if (!documentResult.rows.length) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }
    
    const document = documentResult.rows[0] as any;
    
    // Process the document
    const result = await processDocument(
      document.id,
      document.applicationId,
      document.name,
      document.document_type
    );
    
    res.json({
      success: true,
      message: 'Document processing completed',
      result
    });
    
  } catch (error: unknown) {
    console.error('❌ [AUTO-DOCS] Manual processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Processing failed'
    });
  }
});

/**
 * POST /api/auto-documents/process-application/:applicationId
 * Process all documents for an application
 */
router.post('/process-application/:applicationId', async (req: any, res: any) => {
  try {
    const { applicationId } = req.params;
    
    console.log(`🔄 [AUTO-DOCS] Processing all documents for application: ${applicationId}`);
    
    const results = await processApplicationDocuments(applicationId);
    
    const successCount = results.filter(r => r.ocrSuccess).length;
    const errorCount = results.filter(r => r.errors.length > 0).length;
    
    res.json({
      success: true,
      message: 'Application document processing completed',
      applicationId,
      totalDocuments: results.length,
      successfulProcessing: successCount,
      errors: errorCount,
      results
    });
    
  } catch (error: unknown) {
    console.error('❌ [AUTO-DOCS] Application processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Processing failed'
    });
  }
});

/**
 * GET /api/auto-documents/status/:applicationId
 * Get processing status for an application
 */
router.get('/status/:applicationId', async (req: any, res: any) => {
  try {
    const { applicationId } = req.params;
    
    // Get document counts
    const documentCountResult = await db.execute(sql`
      SELECT COUNT(*) as total_docs,
             COUNT(CASE WHEN document_type = 'bank_statements' THEN 1 END) as bank_statements
      FROM documents
      WHERE applicationId = ${applicationId}
    `);
    
    // Get OCR processing status
    const ocrStatusResult = await db.execute(sql`
      SELECT COUNT(*) as processed_docs
      FROM ocr_results
      WHERE applicationId = ${applicationId}
    `);
    
    // Get banking analysis status
    const bankingStatusResult = await db.execute(sql`
      SELECT COUNT(*) as analyzed_docs
      FROM banking_analysis
      WHERE applicationId = ${applicationId}
    `);
    
    const status = {
      success: true,
      applicationId,
      documents: {
        total: parseInt(documentCountResult.rows[0]?.total_docs || 0),
        bankStatements: parseInt(documentCountResult.rows[0]?.bank_statements || 0)
      },
      processing: {
        ocrCompleted: parseInt(ocrStatusResult.rows[0]?.processed_docs || 0),
        bankingAnalysisCompleted: parseInt(bankingStatusResult.rows[0]?.analyzed_docs || 0)
      },
      status: {
        ocrComplete: parseInt(ocrStatusResult.rows[0]?.processed_docs || 0) >= parseInt(documentCountResult.rows[0]?.bank_statements || 0),
        bankingAnalysisComplete: parseInt(bankingStatusResult.rows[0]?.analyzed_docs || 0) > 0
      }
    };
    
    res.json(status);
    
  } catch (error: unknown) {
    console.error('❌ [AUTO-DOCS] Status check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Status check failed'
    });
  }
});

/**
 * GET /api/auto-documents/monitor
 * Monitor system-wide document processing status
 */
router.get('/monitor', async (req: any, res: any) => {
  try {
    // Get applications with processing status
    const applicationsResult = await db.execute(sql`
      SELECT a.id, a.stage,
             COUNT(d.id) as total_docs,
             COUNT(CASE WHEN d.document_type = 'bank_statements' THEN 1 END) as bank_statements,
             COUNT(ocr.id) as ocr_completed,
             COUNT(ba.id) as banking_completed
      FROM applications a
      LEFT JOIN documents d ON a.id = d.applicationId
      LEFT JOIN ocr_results ocr ON a.id = ocr.applicationId
      LEFT JOIN banking_analysis ba ON a.id = ba.applicationId
      GROUP BY a.id, a.stage
      ORDER BY a.createdAt DESC
    `);
    
    const monitorData = {
      success: true,
      timestamp: new Date().toISOString(),
      applications: applicationsResult.rows.map((row: any) => ({
        applicationId: row.id,
        stage: row.stage,
        documents: {
          total: parseInt(row.total_docs || 0),
          bankStatements: parseInt(row.bank_statements || 0)
        },
        processing: {
          ocrCompleted: parseInt(row.ocr_completed || 0),
          bankingCompleted: parseInt(row.banking_completed || 0)
        },
        status: {
          needsOcr: parseInt(row.bank_statements || 0) > parseInt(row.ocr_completed || 0),
          needsBankingAnalysis: parseInt(row.ocr_completed || 0) > parseInt(row.banking_completed || 0)
        }
      }))
    };
    
    res.json(monitorData);
    
  } catch (error: unknown) {
    console.error('❌ [AUTO-DOCS] Monitor error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Monitor failed'
    });
  }
});

export default router;