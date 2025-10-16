import { Router } from "express";
import { requireAuth } from "../mw/auth";
import pg from "pg";
import { canonEmail } from "../lib/email";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const router = Router();
router.use(requireAuth);

// GET /api/diag/contacts/dupes - Diagnostic endpoint for duplicate analysis
router.get("/dupes", async (_req, res) => {
  try {
    console.log('🔍 Diagnostics: Analyzing contact duplicates...');
    
    // Get all applications with contact emails
    const result = await pool.query(`
      SELECT 
        a.id, a.contact_email, a.contact_first_name, a.contact_last_name, 
        a.created_at, a.updated_at, a.form_data, b.business_name
      FROM applications a 
      LEFT JOIN businesses b ON a.business_id = b.id
      WHERE a.contact_email IS NOT NULL
      ORDER BY a.created_at DESC
    `);
    
    // Group by canonical email
    const emailBuckets = new Map();
    
    result.rows.forEach((row: any) => {
      const email = row.contact_email;
      const canonicalEmail = canonEmail(email);
      
      if (!canonicalEmail) return;
      
      if (!emailBuckets.has(canonicalEmail)) {
        emailBuckets.set(canonicalEmail, []);
      }
      
      emailBuckets.get(canonicalEmail).push({
        id: row.id,
        email: email,
        name: [row.contact_first_name, row.contact_last_name].filter(Boolean).join(' ') || 'Name Not Set',
        company: row.business_name || '—',
        source: 'applications',
        updatedAt: row.updated_at,
      });
    });
    
    // Find duplicates (buckets with >1 record)
    const duplicateBuckets = Array.from(emailBuckets.entries())
      .filter(([, records]) => records.length > 1)
      .map(([email_key, rows]) => ({
        email_key,
        count: rows.length,
        rows: rows
      }));
    
    console.log(`📊 Diagnostics complete: ${emailBuckets.size} unique emails, ${duplicateBuckets.length} duplicate buckets`);
    
    res.json({
      ok: true,
      total_keys: emailBuckets.size,
      dupes_count: duplicateBuckets.length,
      dupes: duplicateBuckets
    });
    
  } catch (e: any) {
    console.error('❌ Error in diagnostics:', e);
    res.status(500).json({ ok: false, error: 'DIAG_ERROR', detail: e.message });
  }
});

export default router;