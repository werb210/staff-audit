import express from 'express';
import incomingCallRouter from './incomingCall';
import callHistoryRouter from './callHistory';
const router = express.Router();
// Mount the incoming call handler
router.use('/', incomingCallRouter);
// Mount the call history and logging system
router.use('/', callHistoryRouter);
// Add status endpoint for communications system
router.get('/status', (req, res) => {
    res.json({
        success: true,
        service: 'Communications System',
        status: 'operational',
        timestamp: new Date().toISOString(),
        modules: {
            incomingCalls: true,
            callHistory: true,
            missedCallEscalation: true,
            partnerReferrals: true,
            twilioWebhooks: true
        }
    });
});
export default router;
