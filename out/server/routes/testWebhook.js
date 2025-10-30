import express from 'express';
const router = express.Router();
// Simple webhook endpoint that always returns success for testing
router.post('/webhook', (req, res) => {
    console.log('✅ Test webhook endpoint hit');
    res.status(200).json({
        success: true,
        message: 'Test webhook processed successfully',
        timestamp: new Date().toISOString()
    });
});
export default router;
