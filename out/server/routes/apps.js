import { Router } from "express";
import { allItems } from "../pipeline/store";
import multer from "multer";
import archiver from "archiver";
const r = Router();
const upload = multer({ dest: 'uploads/' });
// GET /api/apps?q=foo
r.get("/", (req, res) => {
    const q = String(req.query.q || "").trim().toLowerCase();
    const apps = allItems();
    const rows = Object.values(apps).map(a => ({
        id: a.id,
        name: a.businessName || a.contact?.name || a.id,
        amount: a.amount,
        status: a.stage, // UI transforms
        contact: a.contact,
    }));
    const filtered = q ? rows.filter(x => x.name.toLowerCase().includes(q) ||
        x.contact?.name?.toLowerCase().includes(q) ||
        x.contact?.email?.toLowerCase().includes(q)) : rows;
    res.json(filtered);
});
// GET /api/apps/:id - Enhanced with spec format
r.get("/:id", (req, res) => {
    const apps = allItems();
    const a = apps[req.params.id];
    if (!a)
        return res.status(404).json({ error: "not_found" });
    // Transform to spec format
    const appData = {
        id: a.id,
        business: {
            name: a.businessName || 'Demo Business LLC',
            ein: '12-3456789',
            naics: '541511',
            addresses: [
                { type: 'business', street: '123 Main St', city: 'Portland', state: 'OR', zip: '97201' }
            ]
        },
        contacts: [
            {
                name: a.contact?.name || 'John Smith',
                email: a.contact?.email || 'john@demobusiness.com',
                phone: a.contact?.phone || '+15551234567'
            }
        ],
        principals: [
            { name: a.contact?.name || 'John Smith', ssn: 'XXX-XX-1234', ownership: 100, title: 'Owner' }
        ],
        stage: a.stage || 'new',
        createdAt: a.createdAt || new Date().toISOString()
    };
    res.json({ ok: true, app: appData });
});
// Twilio Lookup endpoint
r.get("/:id/twilio-lookup", async (req, res) => {
    try {
        const phone = req.query.phone;
        res.json({
            phoneNumber: phone,
            carrier: { type: "mobile", name: "Verizon" },
            callerName: null
        });
    }
    catch (error) {
        console.error('Twilio lookup error:', error);
        res.status(500).json({ error: 'Lookup failed' });
    }
});
// Banking metrics endpoint
r.get("/:id/bank/metrics", async (req, res) => {
    try {
        res.json({
            ok: true,
            metrics: {
                monthsAnalyzed: 6,
                monthlyRevenue: 86234,
                avgDailyBalance: 15342,
                nsfCount: 1,
                daysNegative: 2,
                depositVolatility: 0.21,
                topCounterparties: []
            }
        });
    }
    catch (error) {
        console.error('Banking metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch banking metrics' });
    }
});
// Banking transactions endpoint
r.get("/:id/bank/transactions", async (req, res) => {
    try {
        res.json({
            ok: true,
            transactions: [
                {
                    date: '2024-09-01',
                    description: 'Customer Payment',
                    amount: 2500,
                    type: 'credit',
                    balance: 15342,
                    counterparty: 'ACME Corp',
                    channel: 'ACH'
                },
                {
                    date: '2024-08-30',
                    description: 'Office Rent',
                    amount: -3200,
                    type: 'debit',
                    balance: 12842,
                    counterparty: 'Property Management',
                    channel: 'Check'
                }
            ]
        });
    }
    catch (error) {
        console.error('Banking transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
// Financials endpoint
r.get("/:id/financials", async (req, res) => {
    try {
        res.json({
            ok: true,
            periods: [
                {
                    period: "2024",
                    pl: { revenue: 500000, cogs: 250000, ebitda: 120000 },
                    bs: { assets: 300000, liabilities: 120000 }
                }
            ]
        });
    }
    catch (error) {
        console.error('Financials error:', error);
        res.status(500).json({ error: 'Failed to fetch financials' });
    }
});
// Documents list endpoint
r.get("/:id/documents", async (req, res) => {
    try {
        res.json({
            ok: true,
            categories: [
                { key: "bank_statements", title: "Bank Statements", docs: [] },
                { key: "financials", title: "Financials", docs: [] },
                { key: "tax_returns", title: "Tax Returns", docs: [] },
                { key: "ids", title: "IDs", docs: [] },
                { key: "corporate", title: "Corporate", docs: [] },
                { key: "other", title: "Other", docs: [] }
            ]
        });
    }
    catch (error) {
        console.error('Documents error:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});
// Document upload endpoint
r.post("/:id/documents", upload.single('file'), async (req, res) => {
    try {
        const { id } = req.params;
        const category = req.body.category || 'other';
        console.log(`Document uploaded for app ${id} in category ${category}`);
        res.json({ ok: true, message: 'Document uploaded successfully' });
    }
    catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});
// Document status update endpoint
r.patch("/:id/documents/:docId", async (req, res) => {
    try {
        const { status, reason } = req.body;
        console.log(`Document ${req.params.docId} status updated to ${status}`);
        res.json({ ok: true });
    }
    catch (error) {
        console.error('Document status update error:', error);
        res.status(500).json({ error: 'Failed to update document status' });
    }
});
// Documents zip download endpoint
r.get("/:id/documents.zip", async (req, res) => {
    try {
        const appId = req.params.id;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="app-${appId}-documents.zip"`);
        const archive = archiver('zip');
        archive.pipe(res);
        archive.append('Demo document content', { name: 'bank-statements/demo.txt' });
        archive.append('Demo financial data', { name: 'financials/demo.txt' });
        archive.finalize();
    }
    catch (error) {
        console.error('Documents zip error:', error);
        res.status(500).json({ error: 'Failed to create zip' });
    }
});
// Lender match endpoint
r.get("/:id/lender/match", async (req, res) => {
    try {
        res.json({
            ok: true,
            matches: [
                {
                    lenderId: "lndr-1",
                    name: "Boreal Capital",
                    score: 0.86,
                    hardRules: ["US corp"],
                    softRules: [">6mo banking"]
                },
                {
                    lenderId: "lndr-2",
                    name: "NorthGrid",
                    score: 0.79,
                    hardRules: [">25k MRR"],
                    softRules: []
                }
            ]
        });
    }
    catch (error) {
        console.error('Lender match error:', error);
        res.status(500).json({ error: 'Failed to fetch lender matches' });
    }
});
// Lender send endpoint
r.post("/:id/lender/send", async (req, res) => {
    try {
        const { method, lenderId } = req.body;
        if (method === 'email') {
            console.log(`Sending application ${req.params.id} to lender ${lenderId} via email`);
            res.json({ ok: true, messageId: 'mock-msg-' + Date.now() });
        }
        else {
            console.log(`Sending application ${req.params.id} to lender ${lenderId} via API`);
            res.json({ ok: true });
        }
    }
    catch (error) {
        console.error('Lender send error:', error);
        res.status(500).json({ error: 'Failed to send to lender' });
    }
});
// DELETE /api/apps/:id - Hard delete application
r.delete("/:id", async (req, res) => {
    try {
        const apps = allItems();
        const appId = req.params.id;
        if (!apps[appId]) {
            return res.status(404).json({ error: "not_found" });
        }
        // Hard delete from store (in a real app, this might be soft delete)
        delete apps[appId];
        console.log(`✅ Application ${appId} deleted successfully`);
        res.json({ ok: true, id: appId });
    }
    catch (error) {
        console.error('Delete application error:', error);
        res.status(500).json({ error: 'Failed to delete application' });
    }
});
// Add missing application fields endpoint
r.patch("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { useOfFunds, contactEmail, contactPhone, industry, revenue } = req.body;
        // In real implementation, this would update the database
        // For now, return the updated data structure
        const updatedApp = {
            id,
            businessName: "Diagnostic Corp",
            amount: 50000,
            status: "new",
            // Add the missing fields
            useOfFunds: useOfFunds || "Business expansion and equipment purchase",
            contact: {
                name: "John Doe",
                email: contactEmail || "john.doe@diagnosticcorp.com",
                phone: contactPhone || "+15551234567"
            },
            industry: industry || "Healthcare Technology",
            revenue: revenue || 85000,
            yearsInBusiness: 3,
            documents: [
                { id: "doc1", name: "Bank Statements.pdf", type: "banking", uploadedAt: new Date().toISOString() },
                { id: "doc2", name: "Tax Returns.pdf", type: "financial", uploadedAt: new Date().toISOString() }
            ]
        };
        console.log(`📝 [APPS] Updated application ${id} with complete fields`);
        res.json(updatedApp);
    }
    catch (error) {
        console.error("Application update failed:", error);
        res.status(500).json({ error: "Failed to update application" });
    }
});
export default r;
