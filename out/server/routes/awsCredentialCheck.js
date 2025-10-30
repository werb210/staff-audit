import express from 'express';
import { validateAWSCredentials } from '../utils/awsCredentialValidator';
const router = express.Router();
// Comprehensive AWS credential validation endpoint
router.get('/validate-credentials', async (req, res) => {
    try {
        console.log(`🔐 [AWS VALIDATION] Starting comprehensive credential validation...`);
        const validation = await validateAWSCredentials();
        if (validation.success) {
            console.log(`✅ [AWS VALIDATION] All credentials and permissions verified`);
            res.json({
                success: true,
                message: 'AWS credentials fully validated',
                details: validation,
                timestamp: new Date().toISOString()
            });
        }
        else {
            console.error(`❌ [AWS VALIDATION] Validation failed: ${validation.error}`);
            res.status(400).json({
                success: false,
                error: validation.error,
                guidance: validation.guidance,
                details: validation,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error(`💥 [AWS VALIDATION] Unexpected error:`, error);
        res.status(500).json({
            success: false,
            error: 'Credential validation system error',
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        });
    }
});
export default router;
