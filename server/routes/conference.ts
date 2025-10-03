import { Router } from 'express';
import twilio from 'twilio';
import fetch from 'node-fetch';
const router = Router();

const {
  PUBLIC_BASE_URL, TWILIO_AUTH_TOKEN,
  CONF_ROOM_NAME='bf-bridge-1', CONF_MOD_PIN='5463', CONF_GUEST_PIN='1234',
  CONF_RECORDING='true',
  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN: T_AUTH
} = process.env as any;

function verify(req:any, path:string) {
  const sig = req.headers['x-twilio-signature'] as string | undefined;
  if (!sig) return true;
  return twilio.validateRequest(TWILIO_AUTH_TOKEN!, sig, `${PUBLIC_BASE_URL}${path}`, req.body);
}

/** Dial-in entry (PINs) */
router.post('/enter', (req: any, res: any) => {
  if (!verify(req, '/api/conference/enter')) return res.status(403).send('Forbidden');
  const vr = new twilio.twiml.VoiceResponse();
  const g = vr.gather({ input: 'dtmf', numDigits: Math.max(CONF_MOD_PIN.length, CONF_GUEST_PIN.length), timeout: 6, action: '/api/conference/role', method: 'POST' });
  g.say('Please enter your host pin, or guest pin.');
  res.type('text/xml').send(vr.toString());
});

router.post('/role', (req: any, res: any) => {
  if (!verify(req, '/api/conference/role')) return res.status(403).send('Forbidden');
  const digits = String(req.body.Digits || '').trim();
  const vr = new twilio.twiml.VoiceResponse();

  const baseOpts:any = {
    endConferenceOnExit: false,
    beep: true,
    statusCallback: '/api/conference/status',
    statusCallbackEvent: ['start','end','join','leave','mute','hold','speaker'],
    statusCallbackMethod: 'POST'
  };
  if (CONF_RECORDING === 'true') baseOpts.record = 'record-from-start';

  if (digits === CONF_MOD_PIN) {
    const d = vr.dial();
    d.conference({ ...baseOpts, startConferenceOnEnter: true, recordingStatusCallback: '/api/conference/recording-status', recordingStatusCallbackMethod: 'POST' }, CONF_ROOM_NAME);
  } else if (digits === CONF_GUEST_PIN) {
    const d = vr.dial();
    d.conference({ ...baseOpts, startConferenceOnEnter: false, waitUrl: 'http://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.mp3' }, CONF_ROOM_NAME);
  } else {
    vr.say('Invalid pin. Please try again.');
    vr.redirect('/api/conference/enter');
  }
  res.type('text/xml').send(vr.toString());
});

/** REST: start ad-hoc conference (returns roomName to use) */
router.post('/start', (req: any, res: any) => {
  const room = `bf-${Date.now()}`;
  res.json({ ok: true, roomName: room });
});

/** REST: add participants by dialing out (click-to-add from UI) */
router.post('/participants', async (req: any, res: any) => {
  const { roomName, fromE164, list } = req.body as { roomName: string; fromE164: string; list: string[] };
  if (!roomName || !fromE164 || !Array.isArray(list)) return res.status(400).json({ ok:false, error:'bad request' });

  const auth = 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${T_AUTH}`).toString('base64');

  const results: any[] = [];
  for (const to of list) {
    // Create an outbound call that lands in the conference room as soon as they answer
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type':'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        To: to,
        From: fromE164,
        Url: `${PUBLIC_BASE_URL}/api/conference/bridge?room=${encodeURIComponent(roomName)}`
      })
    }).then(r=>r.json());
    results.push({ to, sid: r.sid });
  }
  res.json({ ok: true, results });
});

/** TwiML for the dial-out bridge call */
router.post('/bridge', (req: any, res: any) => {
  const room = String(req.query.room || req.body.room || CONF_ROOM_NAME);
  const vr = new twilio.twiml.VoiceResponse();
  const d = vr.dial();
  const opts:any = {
    startConferenceOnEnter: true,
    endConferenceOnExit: false,
    beep: true
  };
  if (CONF_RECORDING === 'true') opts.record = 'record-from-start';
  d.conference(opts, room);
  res.type('text/xml').send(vr.toString());
});

/** Status endpoints (you can persist if needed) */
router.post('/status', (_req, res) => res.sendStatus(200));
router.post('/recording-status', (_req, res) => res.sendStatus(200));

export default router;