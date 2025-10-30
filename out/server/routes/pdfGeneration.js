import { Router } from 'express';
import { generateSignedApplicationPdf } from '../services/simplePdfGenerator';
const router = Router();
// POST /api/applications/:id/generate-pdf - Generate signed application PDF
router.post('/:id/generate-pdf', async (req, res) => {
    try {
        const { id: applicationId } = req.params;
        console.log(`📄 [PDF API] Generating PDF for application: ${applicationId}`);
        if (!applicationId) {
            return res.status(400).json({
                success: false,
                error: 'Application ID is required'
            });
        }
        const result = await generateSignedApplicationPdf(applicationId);
        console.log(`✅ [PDF API] PDF generation completed for: ${applicationId}`);
        res.json(result);
    }
    catch (error) {
        console.error('❌ [PDF API] Generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate PDF',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
