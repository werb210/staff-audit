import express from "express";
const router = express.Router();

// Minimal 200 OK always. Never throw a 401/500 in shell routes.
router.get("/contacts", async (req: any, res: any) => {
  try {
    // Forward to applications endpoint with same auth
    const appResponse = await fetch(`http://localhost:5000/api/applications`, {
      headers: { 
        'Authorization': req.get('Authorization') || '',
        'Content-Type': 'application/json'
      }
    });
    
    if (!appResponse.ok) {
      return res.json({ ok: true, items: [], count: 0, total: 0 });
    }
    
    const data = await appResponse.json();
    const apps = Array.isArray(data) ? data : data.items || [];
    
    const contacts = apps
      .filter((a: any) => a.contactName || a.contactEmail || a.phone)
      .map((a: any) => ({
        id: `app-${a.id}`,
        name: a.contactName || '(unknown)',
        email: a.contactEmail || null,
        phone_e164: a.phone || null,
        mobile_e164: a.phone || null,
        company: a.businessName || null,
        amount_requested: a.requestedAmount || a.amount || 0,
        lead_status: a.status || 'New',
        created_at: a.createdAt || a.created_at || new Date().toISOString()
      }));

    res.json({ ok: true, items: contacts, count: contacts.length, total: contacts.length });
  } catch (e: any) {
    // fallback: still return a shape the UI can render
    console.error('Contacts adapter error:', e);
    res.json({ ok: true, items: [], count: 0, total: 0 });
  }
});

export default router;