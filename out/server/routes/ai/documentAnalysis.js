import { Router } from 'express';
import { documentInsightsService } from '../../services/ai/documentInsights';
import { discrepancyCheckerService } from '../../services/ai/discrepancyChecker';
import { bankingAnalyzerService } from '../../services/ai/bankingAnalyzer';
import { fieldAggregatorService } from '../../services/ai/aggregateFields';
import { documentSummarizerService } from '../../services/ai/documentSummarizer';
import { projectionGeneratorService } from '../../services/ai/projectionGenerator';
import { creditSummaryGeneratorService } from '../../services/ai/creditSummaryGenerator';
import { riskScorerService } from '../../services/ai/riskScorer';
import { conflictCheckerService } from '../../services/ai/conflictChecker';
import { bankBalanceTrendsService } from '../../services/ai/bankBalanceTrends';
import { nsfAnalyzerService } from '../../services/ai/nsfAnalyzer';
import { authJwt } from '../../middleware/authJwt';
const router = Router();
// Apply authentication middleware - FIXED: Use correct auth function
router.use(authJwt);
// Extract document insights and required fields
router.post('/documents/:id/insights', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Document ID is required' });
        }
        // CRITICAL FIX: Validate UUID format to prevent parsing errors
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.status(400).json({
                error: 'Invalid document ID format',
                details: 'Document ID must be a valid UUID'
            });
        }
        console.log(`[DOC-ANALYSIS] Extracting insights for document ${id}`);
        const insights = await documentInsightsService.extractDocumentInsights(id);
        res.json({
            success: true,
            data: insights,
            metadata: {
                documentId: id,
                extractedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[DOC-ANALYSIS] Error extracting insights:', error);
        res.status(500).json({
            error: 'Failed to extract document insights',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Check for discrepancies between documents and application
router.post('/applications/:id/discrepancies', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Application ID is required' });
        }
        console.log(`[DOC-ANALYSIS] Checking discrepancies for application ${id}`);
        const report = await discrepancyCheckerService.compareFieldsToApplication(id);
        res.json({
            success: true,
            data: report,
            metadata: {
                applicationId: id,
                checkedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[DOC-ANALYSIS] Error checking discrepancies:', error);
        res.status(500).json({
            error: 'Failed to check discrepancies',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Analyze banking statement
router.post('/documents/:id/banking-analysis', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Document ID is required' });
        }
        console.log(`[DOC-ANALYSIS] Analyzing banking statement ${id}`);
        const analysis = await bankingAnalyzerService.analyzeBankingStatement(id);
        res.json({
            success: true,
            data: analysis,
            metadata: {
                documentId: id,
                analyzedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[DOC-ANALYSIS] Error analyzing banking statement:', error);
        res.status(500).json({
            error: 'Failed to analyze banking statement',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Batch process documents for insights
router.post('/documents/batch-insights', async (req, res) => {
    try {
        const { documentIds } = req.body;
        if (!Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({
                error: 'documentIds array is required'
            });
        }
        console.log(`[DOC-ANALYSIS] Batch processing ${documentIds.length} documents for insights`);
        const result = await documentInsightsService.batchProcessDocuments(documentIds);
        res.json({
            success: result.errors.length === 0,
            data: result,
            metadata: {
                totalRequested: documentIds.length,
                successfullyProcessed: result.processed.length,
                failedProcessing: result.errors.length,
                processedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[DOC-ANALYSIS] Error in batch processing:', error);
        res.status(500).json({
            error: 'Failed to batch process documents',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Batch analyze banking statements
router.post('/documents/batch-banking', async (req, res) => {
    try {
        const { documentIds } = req.body;
        if (!Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({
                error: 'documentIds array is required'
            });
        }
        console.log(`[DOC-ANALYSIS] Batch analyzing ${documentIds.length} banking statements`);
        const result = await bankingAnalyzerService.batchAnalyzeBankingStatements(documentIds);
        res.json({
            success: result.errors.length === 0,
            data: result,
            metadata: {
                totalRequested: documentIds.length,
                successfullyProcessed: result.analyses.length,
                failedProcessing: result.errors.length,
                processedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[DOC-ANALYSIS] Error in batch banking analysis:', error);
        res.status(500).json({
            error: 'Failed to batch analyze banking statements',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Aggregate OCR fields across documents with conflict detection
router.post('/applications/:id/aggregate-fields', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Application ID is required' });
        }
        console.log(`[DOC-ANALYSIS] Aggregating fields for application ${id}`);
        const aggregatedFields = await fieldAggregatorService.aggregateOCRFields(id);
        res.json({
            success: true,
            data: aggregatedFields,
            metadata: {
                applicationId: id,
                aggregatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[DOC-ANALYSIS] Error aggregating fields:', error);
        res.status(500).json({
            error: 'Failed to aggregate fields',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Generate multi-document summary
router.post('/applications/:id/document-summary', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Application ID is required' });
        }
        console.log(`[DOC-ANALYSIS] Generating document summary for application ${id}`);
        const summary = await documentSummarizerService.summarizeMultipleDocuments(id);
        res.json({
            success: true,
            data: summary,
            metadata: {
                applicationId: id,
                summarizedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[DOC-ANALYSIS] Error generating summary:', error);
        res.status(500).json({
            error: 'Failed to generate document summary',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Generate financial projections
router.post('/applications/:id/financial-projections', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Application ID is required' });
        }
        console.log(`[DOC-ANALYSIS] Generating financial projections for application ${id}`);
        const projections = await projectionGeneratorService.generateFinancialProjections(id);
        res.json({
            success: true,
            data: projections,
            metadata: {
                applicationId: id,
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[DOC-ANALYSIS] Error generating projections:', error);
        res.status(500).json({
            error: 'Failed to generate financial projections',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Generate AI credit summary with PDF
router.post('/applications/:id/credit-summary', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Application ID is required' });
        }
        console.log(`[DOC-ANALYSIS] Generating credit summary for application ${id}`);
        const creditSummary = await creditSummaryGeneratorService.generateCreditSummary(id);
        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="credit-summary-${id}.pdf"`);
        res.send(Buffer.from(creditSummary.pdfBuffer));
    }
    catch (error) {
        console.error('[DOC-ANALYSIS] Error generating credit summary:', error);
        res.status(500).json({
            error: 'Failed to generate credit summary',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Calculate AI risk score
router.post('/applications/:id/risk-score', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Application ID is required' });
        }
        console.log(`[DOC-ANALYSIS] Calculating risk score for application ${id}`);
        const riskAnalysis = await riskScorerService.generateRiskScore(id);
        res.json({
            success: true,
            data: riskAnalysis,
            metadata: {
                applicationId: id,
                calculatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[DOC-ANALYSIS] Error calculating risk score:', error);
        res.status(500).json({
            error: 'Failed to calculate risk score',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Detect field conflicts between application and OCR data
router.post('/applications/:id/field-conflicts', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Application ID is required' });
        }
        console.log(`[DOC-ANALYSIS] Detecting field conflicts for application ${id}`);
        const conflictReport = await conflictCheckerService.detectFieldMismatches(id);
        res.json({
            success: true,
            data: conflictReport,
            metadata: {
                applicationId: id,
                checkedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[DOC-ANALYSIS] Error detecting field conflicts:', error);
        res.status(500).json({
            error: 'Failed to detect field conflicts',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Extract balance trends from banking documents
router.post('/documents/:id/balance-trends', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Document ID is required' });
        }
        console.log(`[DOC-ANALYSIS] Extracting balance trends for document ${id}`);
        const balanceTrends = await bankBalanceTrendsService.extractMonthlyExtremes(id);
        res.json({
            success: true,
            data: balanceTrends,
            metadata: {
                documentId: id,
                analyzedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[DOC-ANALYSIS] Error extracting balance trends:', error);
        res.status(500).json({
            error: 'Failed to extract balance trends',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Analyze NSF trends from banking documents
router.post('/documents/:id/nsf-trends', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Document ID is required' });
        }
        console.log(`[DOC-ANALYSIS] Analyzing NSF trends for document ${id}`);
        const nsfAnalysis = await nsfAnalyzerService.analyzeNSFTrends(id);
        res.json({
            success: true,
            data: nsfAnalysis,
            metadata: {
                documentId: id,
                analyzedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[DOC-ANALYSIS] Error analyzing NSF trends:', error);
        res.status(500).json({
            error: 'Failed to analyze NSF trends',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Get required fields list
router.get('/required-fields', async (req, res) => {
    try {
        const { REQUIRED_FIELDS, getFieldsByCategory } = await import('../../services/ai/requiredFieldsList');
        res.json({
            success: true,
            data: {
                allFields: REQUIRED_FIELDS,
                byCategory: {
                    business: getFieldsByCategory('business'),
                    financial: getFieldsByCategory('financial'),
                    personal: getFieldsByCategory('personal'),
                    compliance: getFieldsByCategory('compliance')
                }
            }
        });
    }
    catch (error) {
        console.error('[DOC-ANALYSIS] Error fetching required fields:', error);
        res.status(500).json({
            error: 'Failed to fetch required fields',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
export default router;
