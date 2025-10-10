// server/routes/contacts.ts
import { Router } from "express";
import { requireAuth } from "../mw/requireAuth";
import pg from "pg";
import { mergeContactsFromApplications } from "../services/contacts";
import { canonEmail } from "../lib/email";
import { getContactIndex } from "../jobs/contactsGuard";
import sanitizeHtml from "sanitize-html";
import validator from "validator";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const r = Router();
// r.use(requireAuth); // Disabled for development - contacts need to load without auth

// Pipeline endpoint for compatibility
r.get("/pipeline", async (req: any, res: any) => {
  try {
    console.log('🔍 GET /api/contacts/pipeline - Fetching contact details');
    res.json({ ok: true, items: [], count: 0 });
  } catch (e: any) {
    console.error("❌ [CONTACTS-PIPELINE] Error:", e);
    res.status(500).json({ error: "Failed to fetch pipeline contacts" });
  }
});

r.get("/", async (req: any, res: any) => {
  try {
    console.log('🔍 GET /api/contacts - Fetching real contacts from database');
    const silo = req.query.silo || (req.path.includes('/slf/') ? 'slf' : 'bf');
    console.log(`🏢 STRICT FILTERING contacts for silo: ${silo}`);

    const contactsQuery = `
      SELECT 
        id, full_name, email, phone, company_name, job_title, status, 
        first_name, last_name, created_at, updated_at, silo
      FROM contacts 
      WHERE silo = $1
      ORDER BY created_at DESC 
      LIMIT 100
    `;
    const contactsResult = await pool.query(contactsQuery, [silo]);
    console.log(`📋 Found ${contactsResult.rows.length} contacts in contacts table`);

    if (contactsResult.rows.length > 0) {
      const contacts = contactsResult.rows.map((c: any) => ({
        id: c.id,
        name: c.full_name,
        firstName: c.first_name || c.full_name?.split(' ')[0] || '',
        lastName: c.last_name || c.full_name?.split(' ').slice(1).join(' ') || '',
        email: c.email,
        phone: c.phone,
        company: c.company_name,
        title: c.job_title,
        status: c.status || 'active',
        owner: 'admin',
        createdAt: c.created_at?.toISOString ? c.created_at.toISOString() : c.created_at,
        updatedAt: c.updated_at?.toISOString ? c.updated_at.toISOString() : c.updated_at,
        lastContact: c.updated_at?.toISOString ? c.updated_at.toISOString() : c.updated_at
      }));

      console.log(`✅ Returning ${contacts.length} formatted contacts`);
      return res.json({ ok: true, items: contacts, count: contacts.length });
    }

    console.log('🔄 No contacts found, falling back to applications merge');
    const enhancedQuery = `
      SELECT 
        a.id, a.status, a.stage, a.contact_email, a.contact_first_name, a.contact_last_name, 
        a.created_at, a.updated_at, a.requested_amount, a.use_of_funds, a.form_data, a.legal_business_name,
        b.business_name
      FROM applications a 
      LEFT JOIN businesses b ON a.business_id = b.id
      ORDER BY a.created_at DESC
      LIMIT 500
    `;
    const result = await pool.query(enhancedQuery);
    const apps = result.rows.map((row: any) => {
      const email = row.contact_email || null;
      return {
        id: row.id,
        contactName: [row.contact_first_name, row.contact_last_name].filter(Boolean).join(' ') || undefined,
        contactEmail: email,
        contactEmailCanon: canonEmail(email),
        contactPhone: row.form_data?.phone || row.form_data?.mobile || null,
        businessName: row.business_name || row.legal_business_name || null,
        amount: Number(row.requested_amount) || 0,
        status: row.status || 'new',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    const mergedContacts = mergeContactsFromApplications(apps);
    res.json({ ok: true, items: mergedContacts, count: mergedContacts.length });
  } catch (e:any) {
    console.error('❌ Error in contacts:', e);
    res.status(200).json({ ok: false, items: [], error: "DB_ERROR", detail: e.message });
  }
});

r.get('/normalized', async (_req, res) => {
  try {
    console.log('🔍 GET /api/contacts/normalized - Fetching from ContactIndex');
    const contactIndex = getContactIndex();
    const items = Array.from(contactIndex.values()).map(contact => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      emailCanon: contact.email_key,
      phone: contact.phone,
      company: contact.company,
      applicationsCount: contact.applicationsCount || 0,
      applications: contact.applications || [],
      mergedFrom: contact.mergedFrom,
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
    }));
    console.log(`✅ Normalized contacts from ContactIndex: ${items.length} unique contacts`);
    res.json({ ok: true, items, count: items.length });
  } catch (e: any) {
    console.error('❌ Error in normalized contacts:', e);
    res.status(500).json({ ok: false, items: [], error: 'CONTACTINDEX_ERROR', detail: e.message });
  }
});

r.get('/merge-dry', async (_req, res) => {
  try {
    console.log('🔍 GET /api/contacts/merge-dry - Analyzing duplicates');
    const result = await pool.query(`
      SELECT 
        a.id, a.contact_email, a.contact_first_name, a.contact_last_name, 
        a.created_at, a.updated_at, a.form_data, b.business_name
      FROM applications a 
      LEFT JOIN businesses b ON a.business_id = b.id
      WHERE a.contact_email IS NOT NULL
      ORDER BY a.created_at DESC
    `);
    const emailBuckets = new Map();
    const contactIndex = getContactIndex();

    result.rows.forEach((row: any) => {
      const canonicalEmail = canonEmail(row.contact_email);
      if (!canonicalEmail) return;
      if (!emailBuckets.has(canonicalEmail)) emailBuckets.set(canonicalEmail, []);
      emailBuckets.get(canonicalEmail).push({
        id: row.id,
        email: row.contact_email,
        name: [row.contact_first_name, row.contact_last_name].filter(Boolean).join(' ') || 'Name Not Set',
        company: row.business_name || '',
        updatedAt: row.updated_at,
      });
    });

    const duplicateBuckets = Array.from(emailBuckets.entries())
      .filter(([canonEmail, records]) => records.length > 1 && !contactIndex.has(canonEmail))
      .map(([canonEmail, records]) => ({
        email_key: canonEmail,
        count: records.length,
        records: records,
      }));

    console.log(`🔍 Found ${duplicateBuckets.length} unprocessed duplicate buckets`);
    res.json({ ok: true, buckets: duplicateBuckets });
  } catch (e: any) {
    console.error('❌ Error in merge dry-run:', e);
    res.status(500).json({ ok: false, error: 'DB_ERROR', detail: e.message });
  }
});

r.post('/merge', async (_req, res) => {
  try {
    console.log('🔄 POST /api/contacts/merge - Triggering ContactsGuard refresh');
    const contactIndex = getContactIndex();
    const beforeCount = contactIndex.size;
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
    result.rows.forEach((row: any) => {
      const canonicalEmail = canonEmail(row.contact_email);
      if (!canonicalEmail) return;
      if (!emailBuckets.has(canonicalEmail)) emailBuckets.set(canonicalEmail, []);
      emailBuckets.get(canonicalEmail).push({
        id: row.id,
        email: row.contact_email,
        name: [row.contact_first_name, row.contact_last_name].filter(Boolean).join(' ') || 'Name Not Set',
        company: row.business_name || '—',
        phone: row.form_data?.phone || row.form_data?.mobile || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    });

    let merged = 0;
    for (const [canonicalEmail, records] of emailBuckets) {
      const sortedRecords = records.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      const primary = sortedRecords[0];
      const allNames = records.map((r: any) => r.name).filter((n: any) => n !== 'Name Not Set');
      const allCompanies = records.map((r: any) => r.company).filter((c: any) => c !== '—');

      const normalized = {
        id: primary.id,
        email: primary.email,
        email_key: canonicalEmail,
        name: allNames[0] || primary.name,
        company: allCompanies[0] || primary.company,
        phone: records.find((r: any) => r.phone)?.phone || '',
        applicationsCount: records.length,
        applications: records.map((r: any) => r.id),
        created_at: primary.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mergedFrom: records.length > 1 ? records.length : undefined,
      };
      contactIndex.set(canonicalEmail, normalized);
      merged++;
    }

    const afterCount = contactIndex.size;
    console.log(`✅ Merge complete: processed ${merged} emails, ContactIndex: ${beforeCount} → ${afterCount}`);
    res.json({ ok: true, merged, before_count: beforeCount, after_count: afterCount });
  } catch (e: any) {
    console.error('❌ Error in merge execution:', e);
    res.status(500).json({ ok: false, error: 'MERGE_ERROR', detail: e.message });
  }
});

r.get("/seed", async (_req, res) => {
  try {
    console.log("🌱 Seeding contacts table...");

    const countResult = await pool.query("SELECT COUNT(*) FROM contacts");
    const count = parseInt(countResult.rows[0].count, 10);
    if (count > 0) {
      console.log("✅ Contacts table already has data; skipping seed.");
      return res.json({ ok: true, message: "Contacts already exist", count });
    }

    const seedData = [
      {
        full_name: "Lisa Morgan",
        first_name: "Lisa",
        last_name: "Morgan",
        email: "lisa@boreal.financial",
        phone: "+15878881837",
        company_name: "Boreal Financial Partners",
        job_title: "Managing Director",
        status: "active",
        silo: "bf"
      },
      {
        full_name: "Andrew Thompson",
        first_name: "Andrew",
        last_name: "Thompson",
        email: "andrew@boreal.financial",
        phone: "+15878881234",
        company_name: "Boreal Financial Partners",
        job_title: "Senior Advisor",
        status: "active",
        silo: "bf"
      },
      {
        full_name: "SLF Contact",
        first_name: "SLF",
        last_name: "Contact",
        email: "contact@slf.ca",
        phone: "+17553146801",
        company_name: "Site Level Financial",
        job_title: "Account Manager",
        status: "active",
        silo: "slf"
      }
    ];

    for (const c of seedData) {
      await pool.query(
        `INSERT INTO contacts (
          id, full_name, first_name, last_name, email, phone, company_name, 
          job_title, status, silo, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now()
        )`,
        [
          c.full_name,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.company_name,
          c.job_title,
          c.status,
          c.silo
        ]
      );
    }

    console.log("✅ Contacts seeded successfully");
    res.json({ message: "✅ Contacts seeded successfully", count: seedData.length });
  } catch (e: any) {
    console.error("❌ Error seeding contacts:", e);
    res.status(500).json({ error: "Database error", details: e.message });
  }
});

export default r;
export { r as contactsRouter };
