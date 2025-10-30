import { Router } from 'express';
import { normalizeApp } from '../services/applications.adapter';
import pg from 'pg';
import { requireAuth } from '../mw/auth';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export const diagApps = Router();

async function getApplications() {
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
  return result.rows.map((row: any) => ({
    id: row.id,
    contactName: [row.contact_first_name, row.contact_last_name].filter(Boolean).join(' ') || null,
    contactEmail: row.contact_email || null,
    contactPhone: row.form_data?.phone || row.form_data?.mobile || null,
    businessName: row.business_name || row.legal_business_name || null,
    amount: Number(row.requested_amount) || 0,
    status: row.status || 'new',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...row
  }));
}

diagApps.get('/diag/apps/fields', requireAuth, async (req: any, res: any) => {
  try {
    const raw = await getApplications();
    const items = raw.map(normalizeApp);

    const missing = items.filter(a => !a.contact.email || !a.businessName || !a.amount);
    res.json({ 
      ok: true, 
      total: items.length, 
      missing: missing.length, 
      sample: missing.slice(0, 10),
      missingFields: {
        noEmail: items.filter(a => !a.contact.email).length,
        noBusinessName: items.filter(a => !a.businessName).length,
        noAmount: items.filter(a => !a.amount).length
      }
    });
  } catch (error: unknown) {
    console.error('❌ Error in apps missing diagnostic:', error);
    res.status(500).json({ ok: false, error: 'Failed to analyze missing fields' });
  }
});

export default diagApps;