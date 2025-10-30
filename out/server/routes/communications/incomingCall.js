import express from 'express';
import { processIncomingCall } from '../../services/partnerReferralService';
const router = express.Router();
/**
 * POST /api/communications/incoming-call
 * Twilio webhook endpoint for handling incoming calls
 *
 * This endpoint receives webhooks from multiple Twilio numbers:
 * - Main business line: Creates regular contacts
 * - Partner referral line: Creates partner_referral contacts with special role access
 */
router.post('/incoming-call', async (req, res) => {
    console.log('📞 [INCOMING-CALL] Webhook received:', req.body);
    try {
        // Validate required Twilio webhook data
        const { To, From, CallSid, CallStatus, Direction } = req.body;
        if (!To || !From || !CallSid) {
            console.error('❌ [INCOMING-CALL] Missing required webhook data:', { To, From, CallSid });
            return res.status(400).json({
                success: false,
                error: 'Missing required webhook data: To, From, CallSid'
            });
        }
        const callData = {
            To,
            From,
            CallSid,
            CallStatus,
            Direction
        };
        // Process the incoming call and create/update contact
        const result = await processIncomingCall(callData);
        console.log('✅ [INCOMING-CALL] Call processed successfully:', result);
        // Respond to Twilio with TwiML (optional - for call handling)
        const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Thank you for calling. Your call has been logged and a representative will contact you shortly.</Say>
    <Pause length="1"/>
    <Say voice="alice">Goodbye.</Say>
    <Hangup/>
</Response>`;
        res.set('Content-Type', 'text/xml');
        res.send(twimlResponse);
    }
    catch (error) {
        console.error('❌ [INCOMING-CALL] Error processing incoming call:', error);
        // Return error TwiML
        const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">We're sorry, but we're experiencing technical difficulties. Please try calling again later.</Say>
    <Hangup/>
</Response>`;
        res.status(500).set('Content-Type', 'text/xml').send(errorTwiml);
    }
});
/**
 * GET /api/communications/incoming-call/test
 * Test endpoint for verifying the webhook functionality
 */
router.get('/incoming-call/test', async (req, res) => {
    console.log('🧪 [INCOMING-CALL] Test endpoint called');
    try {
        // Simulate a test call
        const testCallData = {
            To: '+17758889999', // Partner referral line
            From: '+15551234567', // Test caller
            CallSid: `test-call-${Date.now()}`,
            CallStatus: 'completed',
            Direction: 'inbound'
        };
        const result = await processIncomingCall(testCallData);
        res.json({
            success: true,
            message: 'Test call processed successfully',
            result
        });
    }
    catch (error) {
        console.error('❌ [INCOMING-CALL] Test endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Test call processing failed',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
/**
 * GET /api/communications/incoming-call/status
 * Health check endpoint
 */
router.get('/incoming-call/status', (req, res) => {
    res.json({
        success: true,
        service: 'Incoming Call Handler',
        status: 'operational',
        timestamp: new Date().toISOString(),
        endpoints: {
            webhook: 'POST /api/communications/incoming-call',
            test: 'GET /api/communications/incoming-call/test',
            status: 'GET /api/communications/incoming-call/status'
        }
    });
});
export default router;
