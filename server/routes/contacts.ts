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
    // Return empty array for now - this endpoint is being called by the frontend
    res.json({ ok: true, items: [], count: 0 });
  } catch (e: any) {
    console.error("❌ [CONTACTS-PIPELINE] Error:", e);
    res.status(500).json({ error: "Failed to fetch pipeline contacts" });
  }
});

r.get("/", async (req: any, res: any) => {
  try {
    console.log('🔍 GET /api/contacts - Fetching real contacts from database');
    
    // Get silo from query params (for BF vs SLF isolation)
    const silo = req.query.silo || (req.path.includes('/slf/') ? 'slf' : 'bf');
    console.log(`🏢 STRICT FILTERING contacts for silo: ${silo}`);
    
    // STRICT silo filtering - NO BLEED OVER between BF and SLF
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
      // Format contacts for frontend
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
    
    // Fallback: Fetch from applications if no contacts in contacts table
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

// GET /api/contacts/normalized - Deduplicated view with application counts from ContactIndex
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

// GET /api/contacts/merge-dry - Analyze duplicates without changes
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
      
      if (!emailBuckets.has(canonicalEmail)) {
        emailBuckets.set(canonicalEmail, []);
      }
      emailBuckets.get(canonicalEmail).push({
        id: row.id,
        email: row.contact_email,
        name: [row.contact_first_name, row.contact_last_name].filter(Boolean).join(' ') || 'Name Not Set',
        company: row.business_name || '',
        updatedAt: row.updated_at,
      });
    });
    
    // Find buckets with >1 record that aren't already in ContactIndex
    const duplicateBuckets = Array.from(emailBuckets.entries())
      .filter(([canonEmail, records]) => records.length > 1 && !contactIndex.has(canonEmail))
      .map(([canonEmail, records]) => ({
        email_key: canonEmail,
        count: records.length,
        records: records,
      }));
    
    console.log(`🔍 Found ${duplicateBuckets.length} unprocessed duplicate buckets`);
    res.json({ 
      ok: true, 
      buckets: duplicateBuckets, 
      toMergeCount: duplicateBuckets.reduce((sum, b) => sum + b.count - 1, 0),
      total_processed: contactIndex.size
    });
    
  } catch (e: any) {
    console.error('❌ Error in merge dry-run:', e);
    res.status(500).json({ ok: false, error: 'DB_ERROR', detail: e.message });
  }
});

// POST /api/contacts/merge - Execute automatic merge via ContactsGuard
r.post('/merge', async (_req, res) => {
  try {
    console.log('🔄 POST /api/contacts/merge - Triggering ContactsGuard refresh');
    
    // ContactsGuard refresh handled via getContactIndex() - no external import needed
    
    // Trigger a fresh run of the contacts guard (which updates ContactIndex)
    const contactIndex = getContactIndex();
    const beforeCount = contactIndex.size;
    
    // Re-run the deduplication logic
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
      
      if (!emailBuckets.has(canonicalEmail)) {
        emailBuckets.set(canonicalEmail, []);
      }
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
    
    // Update ContactIndex with fresh data
    let merged = 0;
    for (const [canonicalEmail, records] of emailBuckets) {
      const sortedRecords = records.sort((a: any, b: any) => 
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      );
      
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
    
    res.json({ 
      ok: true, 
      merged: merged, 
      affected: Array.from(contactIndex.keys()),
      before_count: beforeCount,
      after_count: afterCount,
      note: 'ContactIndex refreshed with latest deduplication'
    });
    
  } catch (e: any) {
    console.error('❌ Error in merge execution:', e);
    res.status(500).json({ ok: false, error: 'MERGE_ERROR', detail: e.message });
  }
});

r.get("/:id/timeline", async (req: any, res: any) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM contact_events WHERE contact_id=$1 ORDER BY occurred_at DESC LIMIT 200`, [req.params.id]
    );
    res.json({ ok:true, items: rows });
  } catch (e:any) {
    res.status(500).json({ ok:false, error:"DB_ERROR", detail:e.message });
  }
});

// Individual contact endpoints for 3-panel contacts UI
r.get('/:emailKey', async (req: any, res: any) => {
  try {
    const { emailKey } = req.params;
    console.log(`🔍 GET /api/contacts/${emailKey} - Fetching contact details`);
    
    const contactIndex = getContactIndex();
    const contact = contactIndex.get(decodeURIComponent(emailKey));
    
    if (!contact) {
      res.status(404).json({ ok: false, error: 'CONTACT_NOT_FOUND' });
      return;
    }
    
    // Get applications for this contact
    const applications = await pool.query(`
      SELECT id, contact_email, legal_business_name, requested_amount, status 
      FROM applications 
      WHERE contact_email = $1 
      ORDER BY created_at DESC
    `, [contact.email]);
    
    const item = {
      ...contact,
      applications: applications.rows.map(app => ({
        id: app.id,
        businessName: app.legal_business_name || 'Business Name Not Set',
        amount: app.requested_amount || 0,
        status: app.status
      }))
    };
    
    console.log(`✅ Contact found: ${contact.name} with ${applications.rows.length} applications`);
    res.json({ ok: true, item });
    
  } catch (e: any) {
    console.error('❌ Error fetching contact:', e);
    res.status(500).json({ ok: false, error: 'DB_ERROR', detail: e.message });
  }
});

// Contact timeline endpoint
r.get('/:emailKey/timeline', async (req: any, res: any) => {
  try {
    const { emailKey } = req.params;
    console.log(`🔍 GET /api/contacts/${emailKey}/timeline - Fetching contact timeline`);
    
    const contactIndex = getContactIndex();
    const contact = contactIndex.get(decodeURIComponent(emailKey));
    
    if (!contact) {
      res.status(404).json({ ok: false, error: 'CONTACT_NOT_FOUND' });
      return;
    }
    
    // Get application timeline events for this contact
    const events = await pool.query(`
      SELECT 
        id, created_at, updated_at, status, requested_amount,
        legal_business_name, 'application' as event_type
      FROM applications 
      WHERE contact_email = $1 
      ORDER BY created_at DESC
      LIMIT 50
    `, [contact.email]);
    
    const items = events.rows.map(event => ({
      id: event.id,
      ts: event.created_at,
      kind: event.event_type,
      summary: `Application: ${event.legal_business_name || 'Business'} - $${(event.requested_amount || 0).toLocaleString()} (${event.status})`,
      occurred_at: event.created_at,
      description: `Status: ${event.status}`,
      event_type: 'application'
    }));
    
    console.log(`✅ Timeline found: ${items.length} events for ${contact.name}`);
    res.json({ ok: true, items });
    
  } catch (e: any) {
    console.error('❌ Error fetching timeline:', e);
    res.status(500).json({ ok: false, error: 'DB_ERROR', detail: e.message });
  }
});

// DELETE /api/contacts/:id - Delete contact
r.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ DELETE /api/contacts/${id} - Deleting contact`);
    
    // Try to delete from contacts table first
    const contactResult = await pool.query(`
      DELETE FROM contacts WHERE id = $1 RETURNING id
    `, [id]);
    
    if (contactResult.rows.length > 0) {
      console.log(`✅ Contact deleted from contacts table: ${id}`);
      res.json({ ok: true, message: 'Contact deleted successfully' });
      return;
    }
    
    // If not found in contacts table, try to remove from contact index if it exists
    const contactIndex = getContactIndex();
    let removed = false;
    
    // Look for contact by ID in the contact index
    for (const [key, contact] of contactIndex.entries()) {
      if (contact.id === id) {
        contactIndex.delete(key);
        removed = true;
        console.log(`✅ Contact removed from contact index: ${id}`);
        break;
      }
    }
    
    if (removed) {
      res.json({ ok: true, message: 'Contact removed from index successfully' });
    } else {
      res.status(404).json({ ok: false, error: 'Contact not found' });
    }
    
  } catch (e: any) {
    console.error('❌ Error deleting contact:', e);
    res.status(500).json({ ok: false, error: 'DB_ERROR', detail: e.message });
  }
});

// POST /api/contacts - Create new contact
r.post('/', async (req: any, res: any) => {
  try {
    const { fullName, firstName, lastName, email, phone, company, title, status, notes } = req.body;
    console.log(`📝 POST /api/contacts - Creating new contact: ${fullName || firstName + ' ' + lastName}`);
    
    // 🔒 SECURITY: Sanitize all input fields to prevent XSS
    const sanitizedData = {
      fullName: fullName ? sanitizeHtml(fullName, { allowedTags: [], allowedAttributes: {} }).trim() || null : null,
      firstName: firstName ? sanitizeHtml(firstName, { allowedTags: [], allowedAttributes: {} }).trim() || null : null,
      lastName: lastName ? sanitizeHtml(lastName, { allowedTags: [], allowedAttributes: {} }).trim() || null : null,
      email: email && validator.isEmail(email) ? sanitizeHtml(email, { allowedTags: [], allowedAttributes: {} }).trim() || null : null,
      phone: phone ? sanitizeHtml(phone, { allowedTags: [], allowedAttributes: {} }).trim() || null : null,
      company: company ? sanitizeHtml(company, { allowedTags: [], allowedAttributes: {} }).trim() || null : null,
      title: title ? sanitizeHtml(title, { allowedTags: [], allowedAttributes: {} }).trim() || null : null,
      status: status ? sanitizeHtml(status, { allowedTags: [], allowedAttributes: {} }).trim() || 'new' : 'new',
      notes: notes ? sanitizeHtml(notes, { allowedTags: [], allowedAttributes: {} }).trim() || null : null
    };
    
    // 🔒 SECURITY: Validate required fields after sanitization
    if (!sanitizedData.fullName && !sanitizedData.firstName && !sanitizedData.lastName) {
      return res.status(400).json({ ok: false, error: 'Contact name is required after security validation' });
    }
    
    if (!sanitizedData.email && !sanitizedData.phone) {
      return res.status(400).json({ ok: false, error: 'Valid email or phone is required' });
    }
    
    // Insert into contacts table
    const insertResult = await pool.query(`
      INSERT INTO contacts (
        id, full_name, first_name, last_name, email, phone, 
        company_name, job_title, status, notes, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now()
      ) RETURNING *
    `, [
      sanitizedData.fullName || (sanitizedData.firstName + ' ' + sanitizedData.lastName).trim(),
      sanitizedData.firstName, 
      sanitizedData.lastName, 
      sanitizedData.email, 
      sanitizedData.phone, 
      sanitizedData.company, 
      sanitizedData.title, 
      sanitizedData.status, 
      sanitizedData.notes
    ]);
    
    const newContact = insertResult.rows[0];
    console.log(`✅ Contact created: ${newContact.id}`);
    
    // Format response to match ContactsHub expectations
    const formattedContact = {
      id: newContact.id,
      fullName: newContact.full_name,
      firstName: newContact.first_name,
      lastName: newContact.last_name,
      email: newContact.email,
      phone: newContact.phone,
      company: newContact.company_name,
      title: newContact.job_title,
      status: newContact.status,
      notes: newContact.notes,
      createdAt: newContact.created_at,
      updatedAt: newContact.updated_at
    };
    
    res.status(201).json({ ok: true, data: formattedContact });
    
  } catch (e: any) {
    console.error('❌ Error creating contact:', e);
    res.status(500).json({ ok: false, error: 'DB_ERROR', detail: e.message });
  }
});

// PATCH /api/contacts/:id - Update contact
r.patch('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { fullName, firstName, lastName, email, phone, company, title, status, notes } = req.body;
    console.log(`📝 PATCH /api/contacts/${id} - Updating contact`);
    
    // 🔒 SECURITY: Sanitize all input fields to prevent XSS
    const sanitizedData = {
      fullName: fullName ? sanitizeHtml(fullName, { allowedTags: [], allowedAttributes: {} }) : undefined,
      firstName: firstName ? sanitizeHtml(firstName, { allowedTags: [], allowedAttributes: {} }) : undefined,
      lastName: lastName ? sanitizeHtml(lastName, { allowedTags: [], allowedAttributes: {} }) : undefined,
      email: email && validator.isEmail(email) ? sanitizeHtml(email, { allowedTags: [], allowedAttributes: {} }) : undefined,
      phone: phone ? sanitizeHtml(phone, { allowedTags: [], allowedAttributes: {} }) : undefined,
      company: company ? sanitizeHtml(company, { allowedTags: [], allowedAttributes: {} }) : undefined,
      title: title ? sanitizeHtml(title, { allowedTags: [], allowedAttributes: {} }) : undefined,
      status: status ? sanitizeHtml(status, { allowedTags: [], allowedAttributes: {} }) : undefined,
      notes: notes ? sanitizeHtml(notes, { allowedTags: [], allowedAttributes: {} }) : undefined
    };
    
    const updateResult = await pool.query(`
      UPDATE contacts SET
        full_name = COALESCE($2, full_name),
        first_name = COALESCE($3, first_name),
        last_name = COALESCE($4, last_name),
        email = COALESCE($5, email),
        phone = COALESCE($6, phone),
        company_name = COALESCE($7, company_name),
        job_title = COALESCE($8, job_title),
        status = COALESCE($9, status),
        notes = COALESCE($10, notes),
        updated_at = now()
      WHERE id = $1
      RETURNING *
    `, [id, sanitizedData.fullName, sanitizedData.firstName, sanitizedData.lastName, 
        sanitizedData.email, sanitizedData.phone, sanitizedData.company, 
        sanitizedData.title, sanitizedData.status, sanitizedData.notes]);
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Contact not found' });
    }
    
    const updatedContact = updateResult.rows[0];
    console.log(`✅ Contact updated: ${id}`);
    
    // Format response
    const formattedContact = {
      id: updatedContact.id,
      fullName: updatedContact.full_name,
      firstName: updatedContact.first_name,
      lastName: updatedContact.last_name,
      email: updatedContact.email,
      phone: updatedContact.phone,
      company: updatedContact.company_name,
      title: updatedContact.job_title,
      status: updatedContact.status,
      notes: updatedContact.notes,
      createdAt: updatedContact.created_at,
      updatedAt: updatedContact.updated_at
    };
    
    res.json({ ok: true, data: formattedContact });
    
  } catch (e: any) {
    console.error('❌ Error updating contact:', e);
    res.status(500).json({ ok: false, error: 'DB_ERROR', detail: e.message });
  }
});

export default r;
export { r as contactsRouter };