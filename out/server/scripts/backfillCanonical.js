import { normalizeSubmission } from '../services/appNormalization';
import { pool } from '../db';
async function backfillCanonical() {
    console.log('🔄 Starting canonical fields backfill...');
    const { rows } = await pool.query(`
    SELECT id, fields_raw, business_name, contact_email, requested_amount 
    FROM applications 
    WHERE fields_canonical IS NULL OR business_name IS NULL
  `);
    console.log(`Found ${rows.length} applications to backfill`);
    for (const r of rows) {
        try {
            const canonical = normalizeSubmission(r.fields_raw || {});
            await pool.query(`
        UPDATE applications SET 
          fields_canonical = $1,
          business_name = COALESCE($2, business_name),
          contact_email = COALESCE($3, contact_email),
          contact_phone = COALESCE($4, contact_phone),
          requested_amount = COALESCE($5, requested_amount),
          number_of_employees = COALESCE($6, number_of_employees)
        WHERE id = $7
      `, [
                canonical,
                canonical.businessName === 'Unknown' ? null : canonical.businessName,
                canonical.contact.email,
                canonical.contact.phone,
                canonical.requestedAmountCents,
                canonical.employees,
                r.id
            ]);
            console.log(`✅ Backfilled: ${canonical.businessName} (${r.id})`);
        }
        catch (error) {
            console.error(`❌ Failed to backfill ${r.id}:`, error);
        }
    }
    console.log(`🎉 Backfilled ${rows.length} applications`);
}
// Run if called directly (ESM compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    backfillCanonical()
        .then(() => {
        console.log('✅ Backfill complete');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Backfill failed:', error);
        process.exit(1);
    });
}
export { backfillCanonical };
