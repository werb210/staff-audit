import { Router } from 'express';
import twilio from 'twilio';
const router = Router();
/**
 * Voice endpoint to speak verification code
 * Used as fallback when SMS fails due to A2P 10DLC
 */
router.post('/speak-code', (req, res) => {
    const code = req.query.code;
    if (!code || !/^\d{6}$/.test(code)) {
        return res.status(400).send('Invalid code parameter');
    }
    const vr = new twilio.twiml.VoiceResponse();
    // Speak the code slowly and clearly
    const digits = code.split('').join(', ');
    vr.say({
        voice: 'Polly.Matthew',
        rate: 'slow'
    }, `Hello, this is Boreal Financial. Your verification code is: ${digits}. I repeat, your code is: ${digits}. Thank you.`);
    // Pause and repeat once more
    vr.pause({ length: 1 });
    vr.say({
        voice: 'Polly.Matthew',
        rate: 'slow'
    }, `Once more, your verification code is: ${digits}. Goodbye.`);
    res.type('text/xml').send(vr.toString());
});
export default router;
