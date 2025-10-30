import { Router } from 'express';
export const slf = Router();
// In-memory call tracking for Pack 10
const calls = [];
// Debug logging to see if routes are being hit
slf.use((req, res, next) => {
    console.log(`🔍 SLF Router: ${req.method} ${req.path}`);
    next();
});
// Status endpoint
slf.get('/', (_req, res) => {
    console.log('✅ SLF Status endpoint hit');
    res.json({
        ok: true,
        time: new Date().toISOString(),
        twilio: { voice: true, from: process.env.TWILIO_PHONE_NUMBER || '+1XXXYYYZZZZ' },
        contacts: { ok: true, count: 0 },
        calls: { ok: true, today: 0 }
    });
});
// Alternative status path
slf.get('/status', (_req, res) => {
    console.log('✅ SLF Status (alt) endpoint hit');
    const today = new Date().toISOString().slice(0, 10);
    const todayCalls = calls.filter(c => c.date.slice(0, 10) === today);
    res.json({
        ok: true,
        time: new Date().toISOString(),
        twilio: { voice: true, from: process.env.TWILIO_FROM || process.env.TWILIO_PHONE_NUMBER || '+1XXXYYYZZZZ' },
        contacts: { ok: true, count: 0 },
        calls: { ok: true, today: todayCalls.length }
    });
});
slf.get('/contacts', (_req, res) => {
    console.log('🔧 [SLF-ROUTER] Providing demo contacts for SLF silo');
    // Demo contacts for SLF interface
    const demoContacts = [
        {
            id: 'slf-demo-001',
            name: "Pete's Plumbing",
            firstName: "Pete",
            lastName: "Martinez",
            email: "pete@petesplumbing.com",
            phone: "(555) 123-4567",
            company: "Pete's Plumbing",
            title: "Owner",
            status: "active",
            amount: 100000,
            notes: "Looking for equipment financing",
            pendingOffers: 2,
            country: "USA",
            owner: "SLF System",
            source: "SLF External API (Demo)",
            silo: "slf",
            createdAt: "2025-08-20T10:00:00Z",
            updatedAt: "2025-08-22T16:00:00Z",
            lastContact: "2025-08-22T15:30:00Z"
        },
        {
            id: 'slf-demo-002',
            name: "Rodriguez Construction",
            firstName: "Maria",
            lastName: "Rodriguez",
            email: "maria@rodconstruction.com",
            phone: "(555) 234-5678",
            company: "Rodriguez Construction",
            title: "Project Manager",
            status: "active",
            amount: 200000,
            notes: "Expansion loan needed",
            pendingOffers: 1,
            country: "USA",
            owner: "SLF System",
            source: "SLF External API (Demo)",
            silo: "slf",
            createdAt: "2025-08-21T14:00:00Z",
            updatedAt: "2025-08-22T16:00:00Z",
            lastContact: "2025-08-22T14:45:00Z"
        }
    ];
    res.json({
        ok: true,
        items: demoContacts,
        source: 'SLF External API (Demo)',
        count: demoContacts.length,
        timestamp: new Date().toISOString(),
        note: 'Demo data provided while external API authentication is being configured'
    });
});
slf.get("/v2/contacts", async (_req, res) => {
    // Implement your real v2 source here; ok to return {items: []} until wired
    res.json({ items: [] });
});
slf.get("/ext/credit/requests", async (_req, res) => {
    // Proxy to QA Swagger source if configured, otherwise return demo
    // NOTE: keep it simple for dev. Real impl should read env + forward token.
    res.json({
        items: [
            { company_name: "Accord Financial", email: "ops@accordfinancial.com", phone: "555-0101" },
            { company_name: "Capital Direct", email: "lending@capitaldirect.com", phone: "555-0102" },
            { company_name: "Quick Funding Corp", email: "support@quickfunding.com", phone: "555-0103" },
            { company_name: "Velocity Funding", email: "contact@velocityfunding.com", phone: "555-0104" },
            { company_name: "Premier Business Solutions", email: "info@premierbiz.com", phone: "555-0105" },
            { company_name: "Alliance Capital Group", email: "loans@alliancecg.com", phone: "555-0106" },
            { company_name: "Streamline Financial", email: "apply@streamlinefin.com", phone: "555-0107" },
            { company_name: "Direct Capital Partners", email: "funding@directcp.com", phone: "555-0108" },
            { company_name: "Rapid Business Funding", email: "rapid@bizfunding.com", phone: "555-0109" }
        ]
    });
});
slf.post('/call', (req, res) => {
    console.log('✅ SLF Call endpoint hit:', req.body);
    const { to } = req.body ?? {};
    if (!to)
        return res.status(400).json({ ok: false, error: 'missing_to' });
    const sid = `TEST-${Date.now()}`;
    calls.unshift({ sid, to, date: new Date().toISOString(), status: 'started' });
    // TODO: replace with Twilio REST createCall here
    res.json({ ok: true, sid });
});
// Recent calls endpoint
slf.get('/calls', (_req, res) => {
    res.json({ ok: true, items: calls.slice(0, 25) });
});
export { slf as SlfRouter };
export default slf;
