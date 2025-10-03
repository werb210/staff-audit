import { Router } from 'express';
import twilio from 'twilio';
const { AccessToken } = twilio.jwt;
const { VoiceGrant } = AccessToken;

const r = Router();

// Support both session auth (cookies) and bearer tokens
r.get('/api/voice/token', (req: any, res: any) => {
  const silo = (req.query.silo as string) || "BF";
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  // Handle both naming conventions
  const apiKeySid = process.env.TWILIO_API_KEY_SID || process.env.TWILIO_API_KEY;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET || process.env.TWILIO_API_SECRET;

  if (!accountSid || !apiKeySid || !apiKeySecret) {
    return res.status(500).json({ 
      error: 'Missing Twilio credentials',
      details: 'TWILIO_ACCOUNT_SID and (TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET) or (TWILIO_API_KEY + TWILIO_API_SECRET) must be set',
      available: {
        accountSid: !!accountSid,
        apiKeySid: !!apiKeySid, 
        apiKeySecret: !!apiKeySecret
      }
    });
  }

  try {
    const token = new AccessToken(
      accountSid,
      apiKeySid,
      apiKeySecret,
      { identity: `staff:${req.ip || 'anonymous'}` }
    );

    // Also check for TWILIO_TWIML_APP_SID for TwiML app configuration
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
    if (!twimlAppSid) {
      return res.status(500).json({ 
        error: 'Missing TwiML App SID',
        details: 'TWILIO_TWIML_APP_SID must be set for voice calling'
      });
    }

    token.addGrant(new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    }));

    res
      .set("Access-Control-Allow-Credentials", "true")
      .json({ 
        ok: true, 
        silo, 
        token: token.toJwt(),
        exp: Math.floor(Date.now() / 1000) + 3600 // expires in 1 hour
      });
  } catch (error: unknown) {
    console.error('Error generating voice token:', error);
    res.status(500).json({ error: 'Failed to generate voice token' });
  }
});

export default r;