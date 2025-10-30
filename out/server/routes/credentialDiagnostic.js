import express from 'express';
const router = express.Router();
// Simple credential diagnostic endpoint
router.get('/diagnose', async (req, res) => {
    try {
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        const region = process.env.AWS_DEFAULT_REGION || 'ca-central-1';
        const diagnosis = {
            accessKeyId: {
                exists: !!accessKeyId,
                length: accessKeyId?.length || 0,
                format: accessKeyId?.substring(0, 4) + '...' || 'MISSING',
                validFormat: accessKeyId ? /^AKIA[0-9A-Z]{16}$/.test(accessKeyId) : false
            },
            secretAccessKey: {
                exists: !!secretAccessKey,
                length: secretAccessKey?.length || 0,
                format: secretAccessKey ? 'SET' : 'MISSING',
                validLength: secretAccessKey?.length === 40
            },
            region: {
                value: region,
                exists: !!region
            }
        };
        console.log(`🔍 [CREDENTIAL DIAGNOSIS]`);
        console.log(`   Access Key: ${diagnosis.accessKeyId.format} (${diagnosis.accessKeyId.length} chars)`);
        console.log(`   Secret Key: ${diagnosis.secretAccessKey.format} (${diagnosis.secretAccessKey.length} chars)`);
        console.log(`   Region: ${diagnosis.region.value}`);
        res.json({
            timestamp: new Date().toISOString(),
            diagnosis,
            recommendations: {
                accessKey: diagnosis.accessKeyId.validFormat ? 'Valid format' : 'Invalid - must be AKIA + 16 alphanumeric chars',
                secretKey: diagnosis.secretAccessKey.validLength ? 'Valid length' : `Invalid - must be 40 chars (current: ${diagnosis.secretAccessKey.length})`,
                ready: diagnosis.accessKeyId.validFormat && diagnosis.secretAccessKey.validLength
            }
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Diagnostic failed',
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        });
    }
});
export default router;
