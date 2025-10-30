import { Router } from 'express';
import { riskScoringService } from '../../services/ai/riskScoring';
import { authMiddleware } from '../../middleware/authJwt';
const router = Router();
// Apply authentication middleware
router.use(authMiddleware);
// Get risk score for an application
router.get('/applications/:id/risk-score', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Application ID is required' });
        }
        console.log(`[RISK-API] Calculating risk score for application ${id}`);
        const assessment = await riskScoringService.getRiskScore(id);
        res.json({
            success: true,
            data: assessment,
            metadata: {
                applicationId: id,
                assessedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[RISK-API] Error calculating risk score:', error);
        res.status(500).json({
            error: 'Failed to calculate risk score',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Auto-tag a specific document
router.post('/documents/:id/auto-tag', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Document ID is required' });
        }
        console.log(`[RISK-API] Auto-tagging document ${id}`);
        const tags = await riskScoringService.autoTagDocument(id);
        res.json({
            success: true,
            data: tags,
            metadata: {
                documentId: id,
                taggedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[RISK-API] Error auto-tagging document:', error);
        res.status(500).json({
            error: 'Failed to auto-tag document',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Process all documents for an application (risk + tagging)
router.post('/applications/:id/process', async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Application ID is required' });
        }
        console.log(`[RISK-API] Processing all documents for application ${id}`);
        const result = await riskScoringService.processApplicationDocuments(id);
        res.json({
            success: true,
            data: result,
            metadata: {
                applicationId: id,
                processedAt: new Date().toISOString(),
                documentsProcessed: Object.keys(result.documentTags).length
            }
        });
    }
    catch (error) {
        console.error('[RISK-API] Error processing application documents:', error);
        res.status(500).json({
            error: 'Failed to process application documents',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Batch process multiple applications
router.post('/batch-process', async (req, res) => {
    try {
        const { applicationIds } = req.body;
        if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
            return res.status(400).json({
                error: 'applicationIds array is required'
            });
        }
        console.log(`[RISK-API] Batch processing ${applicationIds.length} applications`);
        const results = [];
        const errors = [];
        for (const appId of applicationIds) {
            try {
                const result = await riskScoringService.processApplicationDocuments(appId);
                results.push({
                    applicationId: appId,
                    ...result
                });
            }
            catch (error) {
                errors.push({
                    applicationId: appId,
                    error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
                });
            }
        }
        res.json({
            success: errors.length === 0,
            data: {
                processed: results,
                errors
            },
            metadata: {
                totalRequested: applicationIds.length,
                successfullyProcessed: results.length,
                failedProcessing: errors.length,
                processedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[RISK-API] Error in batch processing:', error);
        res.status(500).json({
            error: 'Failed to batch process applications',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// Get risk statistics for admin dashboard
router.get('/statistics', async (req, res) => {
    try {
        // This would typically query the database for statistics
        // For now, return mock statistics
        const statistics = {
            totalAssessments: 0, // Would count from aiRiskAssessments table
            riskDistribution: {
                low: 0,
                medium: 0,
                high: 0,
                critical: 0
            },
            averageRiskScore: 0,
            averageConfidence: 0,
            documentsTagged: 0,
            lastProcessed: new Date().toISOString()
        };
        res.json({
            success: true,
            data: statistics,
            metadata: {
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('[RISK-API] Error fetching statistics:', error);
        res.status(500).json({
            error: 'Failed to fetch risk statistics',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
export default router;
