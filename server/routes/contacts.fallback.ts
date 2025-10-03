import { Router } from 'express';
const r = Router();

// Derive "contacts" from applications until real contacts table exists.
r.get('/api/contacts', async (req: any, res: any) => {
  try {
    // Use existing applications API endpoint logic
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/applications`, {
      headers: { 'Authorization': req.get('Authorization') || '' }
    });
    
    if (!response.ok) {
      return res.json({ ok: true, items: [], count: 0, note: 'applications fallback failed' });
    }
    
    const data = await response.json();
    const apps = data.items || data || [];
    
    const contacts = apps
      .filter((a: any) => a.contactName || a.contactEmail || a.phone)
      .map((a: any) => ({
        id: `app-${a.id}`,
        name: a.contactName ?? '(unknown)',
        email: a.contactEmail ?? null,
        phone_e164: a.phone ?? null,
        company: a.businessName ?? null,
        mobile_e164: a.phone ?? null
      }));

    res.json({ ok: true, items: contacts, count: contacts.length });
  } catch (e: any) {
    // If anything fails, fall back to an empty list rather than 500.
    res.json({ ok: true, items: [], count: 0, note: 'contacts fallback active' });
  }
});

export default r;