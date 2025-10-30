import express from 'express';
import { db } from '../db.ts';
import { documents } from '../../shared/schema.ts';
import { eq } from 'drizzle-orm';
import { auditLogger } from '../utils/auditLogger.ts';
const router = express.Router();
// Enhanced OCR processing with audit logging
router.post('/process-document/:id', async (req, res) => {
    try {
        const { id: documentId } = req.params;
        console.log(`🔍 [OCR ENHANCED] Starting OCR processing for document: ${documentId}`);
        // Get document details
        const document = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
        if (!document.length) {
            return res.status(404).json({ error: 'Document not found' });
        }
        const doc = document[0];
        // Only process certain document types
        const ocrEligibleTypes = ['bank_statements', 'profit_loss_statement', 'balance_sheet', 'financial_statements', 'tax_returns'];
        if (!ocrEligibleTypes.includes(doc.documentType)) {
            console.log(`ℹ️ [OCR ENHANCED] Document type ${doc.documentType} not eligible for OCR`);
            return res.status(400).json({
                error: 'Document type not eligible for OCR processing',
                eligibleTypes: ocrEligibleTypes
            });
        }
        // Simulate OCR processing (replace with actual OCR service)
        const ocrResults = {
            extractedText: `[SIMULATED OCR] Financial document analysis for ${doc.fileName}`,
            confidence: 0.95,
            fields: {
                documentType: doc.documentType,
                date: new Date().toISOString().split('T')[0],
                amount: 'N/A',
                companyName: 'Extracted Company Name'
            },
            processingTime: Math.random() * 1000 + 500
        };
        console.log(`✅ [OCR ENHANCED] OCR processing completed for ${doc.fileName}`);
        console.log(`   - Confidence: ${(ocrResults.confidence * 100).toFixed(1)}%`);
        console.log(`   - Processing Time: ${ocrResults.processingTime.toFixed(0)}ms`);
        // Log to audit trail
        await auditLogger.logAction({
            documentId,
            action: 'recovery', // Using recovery as closest match for processing
            details: {
                ocrProcessed: true,
                confidence: ocrResults.confidence,
                documentType: doc.documentType,
                processingTime: ocrResults.processingTime
            }
        });
        res.json({
            success: true,
            documentId,
            fileName: doc.fileName,
            ocrResults,
            message: 'OCR processing completed successfully'
        });
    }
    catch (error) {
        console.error('❌ [OCR ENHANCED] Processing failed:', error);
        res.status(500).json({ error: 'OCR processing failed' });
    }
});
// Get OCR status for multiple documents
router.get('/status/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        // Get all documents for the application
        const appDocuments = await db.select().from(documents)
            .where(eq(documents.applicationId, applicationId));
        const ocrStatus = appDocuments.map(doc => ({
            documentId: doc.id,
            fileName: doc.fileName,
            documentType: doc.documentType,
            ocrEligible: ['bank_statements', 'profit_loss_statement', 'balance_sheet', 'financial_statements', 'tax_returns'].includes(doc.documentType),
            hasChecksum: !!doc.checksum,
            fileSize: doc.fileSize,
            createdAt: doc.createdAt
        }));
        res.json({
            applicationId,
            totalDocuments: appDocuments.length,
            ocrEligible: ocrStatus.filter(d => d.ocrEligible).length,
            withChecksums: ocrStatus.filter(d => d.hasChecksum).length,
            documents: ocrStatus
        });
    }
    catch (error) {
        console.error('❌ [OCR ENHANCED] Status check failed:', error);
        res.status(500).json({ error: 'Failed to get OCR status' });
    }
});
export default router;
