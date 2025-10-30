/**
 * AI Credit Summary Routes
 * Handle AI-generated credit summaries with manual editing
 */
import { Router } from 'express';
import { generateAICreditSummary, saveDraftSummary, submitFinalSummary } from '../services/aiCreditSummaryService';
import { db } from '../db';
import { creditSummaries } from '../../shared/ai-summary-schema';
import { eq } from 'drizzle-orm';
const router = Router();
/**
 * Get existing summary for an application
 */
router.get('/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        console.log(`📊 [AI-SUMMARY] Fetching summary for application: ${applicationId}`);
        const [summary] = await db
            .select()
            .from(creditSummaries)
            .where(eq(creditSummaries.applicationId, applicationId))
            .orderBy(creditSummaries.createdAt)
            .limit(1);
        if (!summary) {
            return res.json({ summary: null });
        }
        res.json({
            success: true,
            summary
        });
    }
    catch (error) {
        console.error(`❌ [AI-SUMMARY] Failed to fetch summary:`, error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
/**
 * Generate new AI summary for an application
 */
router.post('/generate', async (req, res) => {
    try {
        const { applicationId, templateId } = req.body;
        if (!applicationId) {
            return res.status(400).json({
                success: false,
                error: 'Application ID is required'
            });
        }
        console.log(`🧠 [AI-SUMMARY] Generating summary for application: ${applicationId}`);
        const result = await generateAICreditSummary(applicationId, templateId);
        if (result.success) {
            res.json({
                success: true,
                message: 'AI summary generated successfully',
                data: {
                    summaryId: result.summaryId,
                    content: result.content
                }
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    }
    catch (error) {
        console.error(`❌ [AI-SUMMARY] Generation failed:`, error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
/**
 * Save draft changes to a summary
 */
router.post('/:summaryId/draft', async (req, res) => {
    try {
        const { summaryId } = req.params;
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content is required'
            });
        }
        console.log(`💾 [AI-SUMMARY] Saving draft for summary: ${summaryId}`);
        const result = await saveDraftSummary(summaryId, content, req.user?.id);
        if (result.success) {
            res.json({
                success: true,
                message: 'Draft saved successfully'
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    }
    catch (error) {
        console.error(`❌ [AI-SUMMARY] Failed to save draft:`, error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
/**
 * Submit final summary and generate PDF
 */
router.post('/:summaryId/submit', async (req, res) => {
    try {
        const { summaryId } = req.params;
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'Content is required'
            });
        }
        console.log(`🔒 [AI-SUMMARY] Submitting final summary: ${summaryId}`);
        const result = await submitFinalSummary(summaryId, content, req.user?.id);
        if (result.success) {
            res.json({
                success: true,
                message: 'Final summary submitted successfully',
                data: {
                    pdfUrl: result.pdfUrl,
                    documentId: result.documentId
                }
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    }
    catch (error) {
        console.error(`❌ [AI-SUMMARY] Failed to submit final:`, error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
/**
 * Get summary statistics
 */
router.get('/stats/overview', async (req, res) => {
    try {
        // Get summary statistics
        const summaries = await db.select().from(creditSummaries);
        const stats = {
            total: summaries.length,
            drafts: summaries.filter(s => s.status === 'draft').length,
            final: summaries.filter(s => s.status === 'final').length,
            locked: summaries.filter(s => s.status === 'locked').length,
            pdfExported: summaries.filter(s => s.pdfExported).length
        };
        res.json({
            success: true,
            stats
        });
    }
    catch (error) {
        console.error(`❌ [AI-SUMMARY] Failed to get stats:`, error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
export default router;
