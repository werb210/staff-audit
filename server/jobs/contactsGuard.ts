import pg from "pg";
import { canonEmail } from "../lib/email";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const choose = (a?: string, b?: string, fallback = "—") =>
  (a && a !== "Name Not Set" ? a : (b && b !== "Name Not Set" ? b : fallback));

// In-memory contact index for fast deduplication
export const ContactIndex = new Map<string, any>();

export function startContactsGuard() {
  const run = async () => {
    try {
      console.log('🛡️ [ContactsGuard] Starting deduplication pass...');
      
      // Fetch all applications with contact data
      const result = await pool.query(`
        SELECT 
          a.id, a.contact_email, a.contact_first_name, a.contact_last_name, 
          a.created_at, a.updated_at, a.form_data, b.business_name
        FROM applications a 
        LEFT JOIN businesses b ON a.business_id = b.id
        WHERE a.contact_email IS NOT NULL
        ORDER BY a.updated_at DESC
      `);
      
      const emailBuckets = new Map();
      
      // Group applications by canonical email
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
          phone: row.form_data?.phone || row.form_data?.mobile || '',
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      });
      
      let repaired = 0;
      
      // Create or update normalized contacts in memory
      for (const [canonicalEmail, records] of emailBuckets) {
        const existing = ContactIndex.get(canonicalEmail) || {};
        
        // Sort by most recent update
        const sortedRecords = records.sort((a: any, b: any) => 
          new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
        );
        
        const primary = sortedRecords[0];
        const allNames = records.map((r: any) => r.name).filter((n: any) => n !== 'Name Not Set');
        const allCompanies = records.map((r: any) => r.company).filter((c: any) => c !== '—');
        
        const normalized = {
          id: existing.id || primary.id,
          email: primary.email,
          email_key: canonicalEmail,
          name: choose(existing.name, allNames[0], primary.name),
          company: choose(existing.company, allCompanies[0], primary.company),
          phone: records.find((r: any) => r.phone)?.phone || existing.phone || '',
          applicationsCount: records.length,
          applications: records.map((r: any) => r.id),
          created_at: existing.created_at || primary.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          mergedFrom: records.length > 1 ? records.length : undefined,
        };
        
        const beforeHash = JSON.stringify(ContactIndex.get(canonicalEmail) || {});
        ContactIndex.set(canonicalEmail, normalized);
        
        if (beforeHash !== JSON.stringify(normalized)) {
          repaired++;
        }
      }
      
      console.log(`✅ [ContactsGuard] Pass complete: repaired=${repaired}, total_keys=${emailBuckets.size}`);
      
    } catch (error) {
      console.error('❌ [ContactsGuard] Error during deduplication pass:', error);
    }
  };

  // Run immediately on startup
  run();
  
  // Schedule to run every hour
  setInterval(run, 60 * 60 * 1000);
  console.log('🛡️ [ContactsGuard] Scheduled to run every hour');
}

// Helper function to get current contact index
export function getContactIndex() {
  return ContactIndex;
}