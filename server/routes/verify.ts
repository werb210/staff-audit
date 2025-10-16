import {Router} from 'express';
import twilio from 'twilio';
const r = Router();

const on = String(process.env.FF_VERIFY_ROLLOUT || 'false') === 'true';

r.post('/api/verify/start', async (req,res)=>{
  if (!on) return res.json({ ok:true, staged:true }); // no-op when off
  const { to } = req.body || {};
  if (!to) return res.status(400).json({ ok:false, error:'TO_REQUIRED' });
  const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
  await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!).verifications.create({ to, channel:'sms' });
  res.json({ ok:true });
});

r.post('/api/verify/check', async (req,res)=>{
  if (!on) return res.json({ ok:true, staged:true, status:'skipped' });
  const { to, code } = req.body || {};
  const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
  const out = await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!).verificationChecks.create({ to, code });
  res.json({ ok:true, status: out.status }); // pending | approved | canceled
});
export default r;