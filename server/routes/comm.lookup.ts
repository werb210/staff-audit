import {Router} from 'express';
import twilio from 'twilio';
const r = Router();

r.get('/api/comm/lookup', async (req: any, res: any) => {
  try {
    const phone = (req.query.phone as string || '').trim();
    if (!phone) return res.status(400).json({ ok:false, error:'PHONE_REQUIRED' });

    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    const result = await client.lookups.v2.phoneNumbers(phone)
      .fetch({ fields: 'line_type_intelligence,caller_name,carrier' });

    res.json({
      ok: true,
      phone: result.phoneNumber,
      country: result.countryCode,
      carrier: result.carrier?.name ?? null,
      type: result.lineTypeIntelligence?.type ?? result.carrier?.type ?? null
    });
  } catch (e:any) {
    res.status(500).json({ ok:false, error:'LOOKUP_FAIL', detail: e?.message });
  }
});
export default r;