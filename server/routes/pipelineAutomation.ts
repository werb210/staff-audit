/**
 * 🚀 PIPELINE AUTOMATION ENDPOINTS
 * Manual triggers for testing the enhanced pipeline service and SMS integration
 */

import { Router } from 'express';
import { PipelineService } from '../services/pipelineService';
import { sendEnhancedSMS } from './enhancedSmsTemplates';

const router = Router();

/**
 * POST /api/pipeline-automation/evaluate/:applicationId
 * Manually trigger pipeline evaluation for an application
 */
router.post('/evaluate/:applicationId', async (req: any, res: any) => {
  try {
    const { applicationId } = req.params;
    
    console.log(`🔄 [PIPELINE-AUTO] Manual evaluation trigger for application: ${applicationId}`);
    
    const evaluation = await PipelineService.evaluateApplicationStage(applicationId);
    
    res.json({
      success: true,
      evaluation,
      message: 'Pipeline evaluation completed'
    });
    
  } catch (error: unknown) {
    console.error('❌ [PIPELINE-AUTO] Evaluation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to evaluate application'
    });
  }
});

/**
 * POST /api/pipeline-automation/apply/:applicationId
 * Apply pipeline evaluation and update stage
 */
router.post('/apply/:applicationId', async (req: any, res: any) => {
  try {
    const { applicationId } = req.params;
    
    console.log(`🔄 [PIPELINE-AUTO] Applying pipeline fix for application: ${applicationId}`);
    
    const result = await PipelineService.evaluateAndUpdateStage(applicationId);
    
    res.json({
      success: true,
      result,
      message: result.stageUpdated ? 'Pipeline stage updated successfully' : 'No stage update needed'
    });
    
  } catch (error: unknown) {
    console.error('❌ [PIPELINE-AUTO] Apply error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to apply pipeline changes'
    });
  }
});

/**
 * POST /api/pipeline-automation/batch-fix
 * Fix all misclassified applications
 */
router.post('/batch-fix', async (req: any, res: any) => {
  try {
    console.log(`🔄 [PIPELINE-AUTO] Starting batch pipeline fix for all applications`);
    
    await PipelineService.processAllApplications();
    
    res.json({
      success: true,
      message: 'Batch pipeline fix completed successfully'
    });
    
  } catch (error: unknown) {
    console.error('❌ [PIPELINE-AUTO] Batch fix error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to complete batch fix'
    });
  }
});

/**
 * POST /api/pipeline-automation/update/:applicationId
 * Manually trigger pipeline update (evaluate + update if needed)
 */
router.post('/update/:applicationId', async (req: any, res: any) => {
  try {
    const { applicationId } = req.params;
    
    console.log(`🔄 [PIPELINE-AUTO] Manual pipeline update for application: ${applicationId}`);
    
    await PipelineService.evaluateAndUpdateStage(applicationId);
    
    res.json({
      success: true,
      message: 'Pipeline update completed successfully'
    });
    
  } catch (error: unknown) {
    console.error('❌ [PIPELINE-AUTO] Update error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to update application pipeline'
    });
  }
});

/**
 * POST /api/pipeline-automation/test-sms/:applicationId
 * Test enhanced SMS templates
 */
router.post('/test-sms/:applicationId', async (req: any, res: any) => {
  try {
    const { applicationId } = req.params;
    const { templateType, customData } = req.body;
    
    if (!templateType) {
      return res.status(400).json({
        success: false,
        error: 'templateType is required'
      });
    }
    
    console.log(`📱 [PIPELINE-AUTO] Testing SMS template: ${templateType} for application: ${applicationId}`);
    
    const result = await sendEnhancedSMS(applicationId, templateType, customData);
    
    res.json(result);
    
  } catch (error: unknown) {
    console.error('❌ [PIPELINE-AUTO] SMS test error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to send test SMS'
    });
  }
});

/**
 * POST /api/pipeline-automation/simulate-stage-change
 * Simulate stage changes for testing
 */
router.post('/simulate-stage-change', async (req: any, res: any) => {
  try {
    const { applicationId, fromStage, toStage } = req.body;
    
    if (!applicationId || !toStage) {
      return res.status(400).json({
        success: false,
        error: 'applicationId and toStage are required'
      });
    }
    
    console.log(`🎭 [PIPELINE-AUTO] Simulating stage change: ${applicationId} from ${fromStage} to ${toStage}`);
    
    // Determine SMS template based on new stage
    let templateType;
    switch (toStage) {
      case 'Requires Docs':
        templateType = 'submission_no_docs';
        break;
      case 'In Review':
        templateType = 'in_review';
        break;
      case 'Send to Lender':
        templateType = 'all_docs_accepted';
        break;
      case 'Sent to Lender':
        templateType = 'sent_to_lender';
        break;
      default:
        templateType = 'in_review';
    }
    
    const smsResult = await sendEnhancedSMS(applicationId, templateType);
    
    res.json({
      success: true,
      message: 'Stage change simulation completed',
      simulatedStage: toStage,
      templateUsed: templateType,
      smsResult
    });
    
  } catch (error: unknown) {
    console.error('❌ [PIPELINE-AUTO] Simulation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to simulate stage change'
    });
  }
});

export default router;