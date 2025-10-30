import { Router } from 'express';
import { processOCRInsights, runComprehensiveOCRAnalysis } from '../services/ocrInsightsService';
const router = Router();
/**
 * GET /api/ocr-insights/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'operational',
        service: 'OCR Insights Service',
        timestamp: new Date().toISOString()
    });
});
/**
 * GET /api/ocr-insights/:applicationId
 * Get comprehensive OCR insights for an application
 */
router.get('/:applicationId', async (req, res) => {
    // CRITICAL: Validate UUID format to prevent routing conflicts
    const { applicationId } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(applicationId)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid application ID format',
            details: 'Application ID must be a valid UUID'
        });
    }
    try {
        console.log(`🔍 [OCR-INSIGHTS-API] Fetching OCR insights for application ${applicationId}`);
        const insights = await processOCRInsights(applicationId);
        res.json({
            success: true,
            applicationId,
            insights,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error(`❌ [OCR-INSIGHTS-API] Failed to get insights for ${req.params.applicationId}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to process OCR insights',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
/**
 * POST /api/ocr-insights/comprehensive-analysis
 * Run comprehensive OCR analysis on all applications
 */
router.post('/comprehensive-analysis', async (req, res) => {
    try {
        console.log(`🚀 [OCR-INSIGHTS-API] Starting comprehensive OCR analysis`);
        const results = await runComprehensiveOCRAnalysis();
        res.json({
            success: true,
            message: 'Comprehensive OCR analysis completed',
            results,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error(`❌ [OCR-INSIGHTS-API] Comprehensive analysis failed:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to run comprehensive OCR analysis',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
/**
 * POST /api/ocr-insights/reprocess/:applicationId
 * Force reprocessing of OCR insights for an application
 */
router.post('/reprocess/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        console.log(`🔄 [OCR-INSIGHTS-API] Reprocessing OCR insights for application ${applicationId}`);
        // This will re-run OCR on any documents that need it
        const insights = await processOCRInsights(applicationId);
        res.json({
            success: true,
            message: 'OCR insights reprocessed successfully',
            applicationId,
            insights,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error(`❌ [OCR-INSIGHTS-API] Failed to reprocess ${req.params.applicationId}:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to reprocess OCR insights',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
export default router;
