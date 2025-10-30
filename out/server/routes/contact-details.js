import { Router } from 'express';
import { requireAuth } from '../mw/auth';
import { db } from '../db/drizzle';
import { sql } from 'drizzle-orm';
const router = Router();
router.use(requireAuth);
// GET /api/contacts/:id - Get single contact with full details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`👤 [CONTACT-DETAIL] Fetching contact: ${id}`);
        // Get contact from database
        const { rows } = await db.execute(sql `
      SELECT 
        id, full_name, first_name, last_name, email, phone, 
        company_name, job_title, status, notes, createdAt, updatedAt, silo
      FROM contacts 
      WHERE id = ${id}
    `);
        if (rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Contact not found' });
        }
        const contact = rows[0];
        // Format contact for frontend
        const formattedContact = {
            id: contact.id,
            fullName: contact.full_name,
            firstName: contact.first_name,
            lastName: contact.last_name,
            email: contact.email,
            phone: contact.phone,
            company: contact.company_name,
            title: contact.job_title,
            status: contact.status,
            notes: contact.notes,
            silo: contact.silo,
            createdAt: contact.createdAt,
            updatedAt: contact.updatedAt,
            // Add computed fields for UI
            initials: getInitials(contact.first_name, contact.last_name),
            avatarUrl: null, // TODO: Implement avatar system
            lastContactAt: contact.updatedAt
        };
        res.json({ ok: true, data: formattedContact });
    }
    catch (error) {
        console.error('❌ [CONTACT-DETAIL] Error:', error);
        res.status(500).json({ ok: false, error: 'Failed to fetch contact details' });
    }
});
// GET /api/contacts/:id/timeline - Get contact timeline
router.get('/:id/timeline', async (req, res) => {
    try {
        const { id } = req.params;
        // Get timeline events for this contact
        const { rows } = await db.execute(sql `
      SELECT 
        id, kind, direction, subject, body, createdAt, meta
      FROM comms 
      WHERE contact_id = ${id}
      ORDER BY createdAt DESC
      LIMIT 100
    `);
        const events = rows.map((event) => ({
            id: event.id,
            type: event.kind,
            direction: event.direction,
            title: event.subject,
            description: event.body,
            timestamp: event.createdAt,
            metadata: typeof event.meta === 'string' ? JSON.parse(event.meta) : event.meta
        }));
        // Calculate counts by type
        const counts = events.reduce((acc, event) => {
            acc[event.type] = (acc[event.type] || 0) + 1;
            return acc;
        }, {});
        res.json({
            events,
            counts,
            updatedAt: new Date().toISOString(),
            lastContactAt: events.length > 0 ? events[0].timestamp : null
        });
    }
    catch (error) {
        console.error('❌ [CONTACT-TIMELINE] Error:', error);
        res.status(500).json({ ok: false, error: 'Failed to fetch contact timeline' });
    }
});
// GET /api/contacts/:id/associations - Get contact associations
router.get('/:id/associations', async (req, res) => {
    try {
        const { id } = req.params;
        // Get applications associated with this contact
        const { rows: applications } = await db.execute(sql `
      SELECT 
        id, status, stage, requested_amount, createdAt, legal_business_name
      FROM applications 
      WHERE contact_email = (SELECT email FROM contacts WHERE id = ${id})
      ORDER BY createdAt DESC
      LIMIT 10
    `);
        // Get documents associated with this contact
        const { rows: documents } = await db.execute(sql `
      SELECT 
        id, name, type, size, createdAt
      FROM documents 
      WHERE contact_id = ${id}
      ORDER BY createdAt DESC
      LIMIT 20
    `);
        // Format associations
        const associations = {
            companies: [], // TODO: Implement company associations
            applications: applications.map((app) => ({
                id: app.id,
                name: app.legal_business_name || 'Unknown Business',
                status: app.status,
                stage: app.stage,
                amount: app.requested_amount,
                createdAt: app.createdAt
            })),
            documents: documents.map((doc) => ({
                id: doc.id,
                name: doc.name,
                type: doc.type,
                size: doc.size,
                createdAt: doc.createdAt
            }))
        };
        res.json({ ok: true, data: associations });
    }
    catch (error) {
        console.error('❌ [CONTACT-ASSOCIATIONS] Error:', error);
        res.status(500).json({ ok: false, error: 'Failed to fetch contact associations' });
    }
});
// GET /api/contacts/:id/email/threads - Get email threads for contact
router.get('/:id/email/threads', async (req, res) => {
    try {
        const { id } = req.params;
        // Get email communications for this contact
        const { rows } = await db.execute(sql `
      SELECT 
        id, subject, body, direction, createdAt, meta
      FROM comms 
      WHERE contact_id = ${id} AND kind = 'email'
      ORDER BY createdAt DESC
      LIMIT 50
    `);
        const threads = rows.map((email) => ({
            id: email.id,
            subject: email.subject,
            body: email.body,
            direction: email.direction,
            timestamp: email.createdAt,
            metadata: typeof email.meta === 'string' ? JSON.parse(email.meta) : email.meta
        }));
        res.json({ ok: true, data: threads });
    }
    catch (error) {
        console.error('❌ [CONTACT-EMAIL] Error:', error);
        res.status(500).json({ ok: false, error: 'Failed to fetch email threads' });
    }
});
// GET /api/contacts/:id/sms/threads - Get SMS threads for contact
router.get('/:id/sms/threads', async (req, res) => {
    try {
        const { id } = req.params;
        // Get SMS communications for this contact
        const { rows } = await db.execute(sql `
      SELECT 
        id, body, direction, createdAt, meta
      FROM comms 
      WHERE contact_id = ${id} AND kind = 'sms'
      ORDER BY createdAt DESC
      LIMIT 100
    `);
        const threads = rows.map((sms) => ({
            id: sms.id,
            message: sms.body,
            direction: sms.direction,
            timestamp: sms.createdAt,
            metadata: typeof sms.meta === 'string' ? JSON.parse(sms.meta) : sms.meta
        }));
        res.json({ ok: true, data: threads });
    }
    catch (error) {
        console.error('❌ [CONTACT-SMS] Error:', error);
        res.status(500).json({ ok: false, error: 'Failed to fetch SMS threads' });
    }
});
// Helper function to generate initials
function getInitials(firstName, lastName) {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}
export default router;
