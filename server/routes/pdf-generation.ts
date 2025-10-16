/**
 * PDF Generation Routes
 * Test and bulk generate application PDFs
 */

import { Router } from 'express';
import { 
  generateApplicationPDF, 
  generateAllApplicationPDFs, 
  testPDFGeneration,
  saveDocumentToS3AndDB 
} from '../services/pdfGeneratorService';

const router = Router();

/**
 * Test PDF generation for a single application
 */
router.post('/test', async (req: any, res: any) => {
  try {
    const { applicationId } = req.body;
    
    console.log(`🧪 [PDF-TEST] Starting PDF generation test`, { applicationId });
    
    const result = await testPDFGeneration(applicationId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'PDF generation test successful',
        data: {
          applicationId: result.applicationId,
          filename: result.filename,
          fileSize: result.fileSize,
          s3Key: result.s3Key
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error: unknown) {
    console.error(`❌ [PDF-TEST] Test failed:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Generate PDF for a specific application
 */
router.post('/generate/:applicationId', async (req: any, res: any) => {
  try {
    const { applicationId } = req.params;
    
    console.log(`📝 [PDF-GEN] Generating PDF for application: ${applicationId}`);
    
    // Generate PDF
    const pdfBuffer = await generateApplicationPDF(applicationId);
    
    // Save to S3 and database
    const filename = `ApplicationSummary-${applicationId}.pdf`;
    const documentId = await saveDocumentToS3AndDB(
      applicationId,
      pdfBuffer,
      filename,
      'generated_application_summary',
      'accepted'
    );
    
    res.json({
      success: true,
      message: 'PDF generated successfully',
      data: {
        applicationId,
        filename,
        documentId,
        fileSize: pdfBuffer.length
      }
    });
    
  } catch (error: unknown) {
    console.error(`❌ [PDF-GEN] Generation failed:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Generate PDFs for all applications in bulk
 */
router.post('/generate-all', async (req: any, res: any) => {
  try {
    console.log(`🔄 [PDF-BULK] Starting bulk PDF generation`);
    
    const results = await generateAllApplicationPDFs();
    
    res.json({
      success: true,
      message: 'Bulk PDF generation completed',
      data: results
    });
    
  } catch (error: unknown) {
    console.error(`❌ [PDF-BULK] Bulk generation failed:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Get PDF generation status/stats
 */
router.get('/status', async (req: any, res: any) => {
  try {
    // This could be expanded to show generation statistics
    res.json({
      success: true,
      message: 'PDF generation service is operational',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    console.error(`❌ [PDF-STATUS] Status check failed:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

export default router;