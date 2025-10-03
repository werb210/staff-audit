import { Router } from 'express';
import { creditSummaryGenerator } from '../../services/pdf/creditSummaryGenerator';
import { authMiddleware } from '../../middleware/authJwt';

const router = Router();

// Apply authentication middleware
router.use(authMiddleware);

// Generate credit summary PDF
router.post('/:id/summary', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    console.log(`[CREDIT-SUMMARY] Generating PDF for application ${id}`);
    
    const pdfBuffer = await creditSummaryGenerator.generateCreditSummaryPDF(id);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="credit-summary-${id.slice(0, 8)}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
    
  } catch (error: unknown) {
    console.error('[CREDIT-SUMMARY] Error generating PDF:', error);
    res.status(500).json({ 
      error: 'Failed to generate credit summary PDF',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Get editable credit summary data
router.get('/:id/summary', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    console.log(`[CREDIT-SUMMARY] Generating editable summary for application ${id}`);
    
    const summaryData = await creditSummaryGenerator.generateEditableSummary(id);
    
    res.json({
      success: true,
      data: summaryData
    });
    
  } catch (error: unknown) {
    console.error('[CREDIT-SUMMARY] Error generating editable summary:', error);
    res.status(500).json({ 
      error: 'Failed to generate credit summary',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Generate AI summary text only (for preview)
router.post('/:id/ai-preview', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    const summaryData = await creditSummaryGenerator.generateEditableSummary(id);
    
    res.json({
      success: true,
      aiSummary: summaryData.aiSummary,
      applicationData: summaryData.applicationData
    });
    
  } catch (error: unknown) {
    console.error('[CREDIT-SUMMARY] Error generating AI preview:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI preview',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

export default router;