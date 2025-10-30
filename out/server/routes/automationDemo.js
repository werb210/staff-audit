import { Router } from 'express';
// REMOVED: Auth middleware import (authentication system deleted)
import { PipelineAutomationService } from '../services/pipelineAutomation';
const router = Router();
// Demo endpoint to test automation workflows
router.post('/demo/trigger-automation/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        console.log(`🧪 Manual automation demo triggered for application ${applicationId}`);
        // Run automation check
        const result = await PipelineAutomationService.checkDocumentCompletionStatus(applicationId);
        res.json({
            success: true,
            applicationId,
            automationResult: result,
            message: 'Automation workflow completed',
            triggeredBy: req.user?.email
        });
    }
    catch (error) {
        console.error('❌ Automation demo error:', error);
        res.status(500).json({
            success: false,
            error: 'Automation demo failed'
        });
    }
});
// Demo endpoint to test SMS notification
router.post('/demo/test-sms/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        console.log(`📱 Manual SMS demo triggered for application ${applicationId}`);
        // Test SMS notification
        const result = await PipelineAutomationService.notifyClientOfRejection(applicationId);
        res.json({
            success: true,
            applicationId,
            smsResult: result,
            message: 'SMS notification test completed',
            triggeredBy: req.user?.email
        });
    }
    catch (error) {
        console.error('❌ SMS demo error:', error);
        res.status(500).json({
            success: false,
            error: 'SMS demo failed'
        });
    }
});
export default router;
