import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/authMiddleware';
const router = Router();
// map any legacy/DB field names into one canonical shape
function normalizeApp(raw) {
    // Map database status to proper pipeline stages
    let stage = (raw.stage || raw.status || 'new').toLowerCase();
    if (stage === 'draft')
        stage = 'new'; // FIX: Map draft to new
    return {
        id: raw.id || raw.appId || raw.uuid,
        stage: stage,
        amount: Number(raw.amount ?? raw.requested_amount ?? raw.requestedAmount ?? 0),
        company: raw.company || raw.businessName || raw.business_name || raw.legal_business_name || '',
        businessType: raw.business_type || raw.businessType || raw.industry || '',
        contactEmail: (raw.contactEmail || raw.contact_email || raw.email || '').toLowerCase(),
        contactName: raw.contactName ||
            (raw.contact_first_name && raw.contact_last_name ? `${raw.contact_first_name} ${raw.contact_last_name}` : '') ||
            raw.primary_contact || raw.ownerName || '',
        contactPhone: raw.contactPhone || raw.contact_phone || raw.phone || raw.mobile || raw.form_data?.phone || raw.form_data?.mobile || '',
        createdAt: raw.createdAt || raw.createdAt || raw.submitted_at || null,
        updatedAt: raw.updatedAt || raw.updatedAt || raw.last_activity_at || raw.createdAt || null,
        // keep everything else so the drawer can render ALL fields
        _raw: raw,
    };
}
// GET /normalized - canonical list with field mapping (mounted at /api/applications)
router.get('/normalized', requireAuth, async (req, res) => {
    try {
        console.log('🎯 [NORMALIZED] Fetching applications with field mapping...');
        // Enhanced query with business data
        const enhancedQuery = `
      SELECT 
        a.id, a.status, a.stage, a.contact_email, a.contact_first_name, a.contact_last_name, 
        a.createdAt, a.updatedAt, a.requested_amount, a.use_of_funds, a.form_data, a.legal_business_name,
        b.business_name, b.business_type, b.industry
      FROM applications a 
      LEFT JOIN businesses b ON a.businessId = b.id
      ORDER BY a.createdAt DESC
      LIMIT 500
    `;
        const result = await pool.query(enhancedQuery);
        console.log('✅ Query executed successfully, rows:', result.rows.length);
        // Normalize each application using the field mapping
        const items = result.rows.map(normalizeApp);
        console.log('✅ Normalized', items.length, 'applications');
        res.json({
            ok: true,
            items: items
        });
    }
    catch (error) {
        console.error('❌ Error in normalized applications route:', error);
        res.json({
            ok: true,
            items: [] // safe fallback; never 500
        });
    }
});
// GET /normalized/:id - single normalized application (mounted at /api/applications) 
router.get('/normalized/:id', requireAuth, async (req, res) => {
    try {
        const enhancedQuery = `
      SELECT 
        a.*, b.business_name, b.business_type, b.industry
      FROM applications a 
      LEFT JOIN businesses b ON a.businessId = b.id
      WHERE a.id = $1
    `;
        const result = await pool.query(enhancedQuery, [req.params.id]);
        const item = result.rows.length > 0 ? normalizeApp(result.rows[0]) : null;
        res.json({ ok: true, item });
    }
    catch (error) {
        console.error('❌ Error fetching single normalized application:', error);
        res.json({ ok: true, item: null });
    }
});
// Pipeline board endpoint (mounted at /api/pipeline)
router.get('/board/normalized', requireAuth, async (req, res) => {
    try {
        console.log('🎯 [NORMALIZED] Fetching pipeline board with lanes...');
        // Get applications from DB
        const enhancedQuery = `
      SELECT 
        a.id, a.status, a.stage, a.contact_email, a.contact_first_name, a.contact_last_name, 
        a.createdAt, a.updatedAt, a.requested_amount, a.use_of_funds, a.form_data, a.legal_business_name,
        b.business_name, b.business_type, b.industry
      FROM applications a 
      LEFT JOIN businesses b ON a.businessId = b.id
      ORDER BY a.createdAt DESC
      LIMIT 500
    `;
        const result = await pool.query(enhancedQuery);
        const items = result.rows.map(normalizeApp);
        // Group by stage into lanes
        const lanes = [
            { key: 'new', title: 'New', items: items.filter(app => app.stage === 'new') },
            { key: 'requires_docs', title: 'Requires Docs', items: items.filter(app => app.stage === 'requires_docs') },
            { key: 'in_review', title: 'In Review', items: items.filter(app => app.stage === 'in_review') },
            { key: 'with_lender', title: 'With Lender', items: items.filter(app => app.stage === 'with_lender') },
            { key: 'accepted', title: 'Accepted', items: items.filter(app => app.stage === 'accepted') },
            { key: 'declined', title: 'Declined', items: items.filter(app => app.stage === 'declined') }
        ];
        console.log('✅ Normalized board with', lanes.length, 'lanes');
        res.json({
            ok: true,
            lanes: lanes
        });
    }
    catch (error) {
        console.error('❌ Error in normalized pipeline board route:', error);
        res.json({
            ok: true,
            lanes: [] // safe fallback
        });
    }
});
export default router;
