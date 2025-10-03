/**
 * V2 Fraud Detection API Routes
 * Document Similarity Detection and Fraud Analysis endpoints
 */

import { Router } from 'express';
import { validateRequest, validationSchemas } from '../middleware/inputValidation';

import { FraudDetectionService } from '../fraud-detection-service';

// Simple auth middleware consistent with other V2 modules
const simpleAuth = (req: any, res: any, next: any) => {
  next(); // For now, proceed without auth checks for development
};

const router = Router();

// Initialize fraud detection service
const fraudService = new FraudDetectionService();

/**
 * POST /api/fraud/analyze/:documentId
 * Analyze document for fraud indicators
 */
router.post('/analyze/:documentId', simpleAuth, async (req: any, res: any) => {
  const startTime = Date.now();
  
  try {
    const documentId = parseInt(req.params.documentId);
    
    if (isNaN(documentId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid document ID' 
      });
    }

    console.log(`🔍 Starting fraud analysis for document ${documentId}`);
    
    // Analyze document for fraud indicators
    const result = await fraudService.analyzeDocument(documentId);
    
    console.log(`✅ Document ${documentId} fraud analysis completed: ${result.fraudScore}/100 score, ${result.riskLevel} risk`);
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: result,
      meta: {
        processingTime,
        timestamp: new Date().toISOString(),
        model: 'gpt-4o'
      }
    });
    
  } catch (error: unknown) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Error analyzing document ${req.params.documentId}:`, error);
    
    res.status(500).json({
      success: false,
      error: {
        documentId: parseInt(req.params.documentId),
        message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
      },
      meta: {
        processingTime,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/fraud/cross-application/:applicationId
 * Run cross-application fraud analysis
 */
router.post('/cross-application/:applicationId', simpleAuth, async (req: any, res: any) => {
  const startTime = Date.now();
  
  try {
    const { applicationId } = req.params;
    
    console.log(`🔍 Starting cross-application fraud analysis for ${applicationId}`);
    
    const result = await fraudService.analyzeApplication(applicationId);
    
    console.log(`✅ Application ${applicationId} fraud analysis completed: ${result.overallFraudScore}/100 score`);
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: result,
      meta: {
        processingTime,
        timestamp: new Date().toISOString(),
        model: 'gpt-4o'
      }
    });
    
  } catch (error: unknown) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Error analyzing application ${req.params.applicationId}:`, error);
    
    res.status(500).json({
      success: false,
      error: {
        applicationId: req.params.applicationId,
        message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
      },
      meta: {
        processingTime,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/fraud/results/:documentId
 * Get fraud analysis results for a document
 */
router.get('/results/:documentId', simpleAuth, async (req: any, res: any) => {
  try {
    const documentId = parseInt(req.params.documentId);
    
    if (isNaN(documentId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid document ID' 
      });
    }
    
    // This would query the fraud_detection_results table
    // For now, return a placeholder response
    res.json({
      success: true,
      data: {
        documentId,
        message: 'Fraud results retrieval endpoint ready for implementation'
      }
    });
    
  } catch (error: unknown) {
    console.error(`❌ Error getting fraud results for document ${req.params.documentId}:`, error);
    
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
      }
    });
  }
});

/**
 * GET /api/fraud/stats
 * Get fraud detection statistics
 */
router.get('/stats', simpleAuth, async (req: any, res: any) => {
  try {
    console.log('📊 Retrieving fraud detection statistics');
    
    const stats = await fraudService.getStats();
    
    res.json({
      success: true,
      data: stats,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: unknown) {
    console.error('❌ Error getting fraud stats:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
      }
    });
  }
});

/**
 * GET /api/fraud/flagged
 * Get flagged applications requiring manual review
 */
router.get('/flagged', simpleAuth, async (req: any, res: any) => {
  try {
    console.log('🚩 Retrieving flagged applications');
    
    const flagged = await fraudService.getFlaggedApplications();
    
    res.json({
      success: true,
      data: flagged,
      meta: {
        count: flagged.length,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: unknown) {
    console.error('❌ Error getting flagged applications:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
      }
    });
  }
});

export default router;