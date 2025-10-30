import { Router } from 'express';
import { canonicalEmail } from '../services/contacts';
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const diagDupes = Router();
diagDupes.get('/diag/contacts/dupes', async (req, res) => {
    try {
        // Fetch applications data (same query as applications route)
        const enhancedQuery = `
      SELECT 
        a.id, a.status, a.stage, a.contact_email, a.contact_first_name, a.contact_last_name, 
        a.createdAt, a.updatedAt, a.requested_amount, a.use_of_funds, a.form_data, a.legal_business_name,
        b.business_name
      FROM applications a 
      LEFT JOIN businesses b ON a.businessId = b.id
      ORDER BY a.createdAt DESC
      LIMIT 500
    `;
        const result = await pool.query(enhancedQuery);
        const apps = result.rows.map((row) => ({
            id: row.id,
            contactName: [row.contact_first_name, row.contact_last_name].filter(Boolean).join(' ') || null,
            contactEmail: row.contact_email || null,
            contactPhone: row.form_data?.phone || row.form_data?.mobile || null,
            businessName: row.business_name || row.legal_business_name || null,
            amount: Number(row.requested_amount) || 0,
            status: row.status || 'new',
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        }));
        const map = new Map();
        for (const a of apps) {
            const em = canonicalEmail(a.contactEmail || '');
            if (!em)
                continue;
            if (!map.has(em))
                map.set(em, []);
            map.get(em).push(a);
        }
        const dupes = [...map.entries()]
            .filter(([, arr]) => arr.length > 1)
            .map(([email, arr]) => ({ email, count: arr.length, appIds: arr.map(a => a.id) }));
        res.json({ ok: true, dupes });
    }
    catch (error) {
        console.error('🔴 Error in dupes diagnostic:', error);
        res.json({ ok: false, dupes: [], error: 'Failed to analyze duplicates' });
    }
});
export default diagDupes;
