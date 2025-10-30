/**
 * Enhanced CRM Contact Card API Routes
 * Implements timeline-centric contact management with Twilio and Microsoft Graph integration
 */
import { Router } from 'express';
import { db } from '../db';
import { contactLogs, notes, callLogs, smsMessages, applications } from '../../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
const router = Router();
/**
 * GET /api/crm/contacts/:id
 * Get detailed contact information with timeline data
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🔍 [CRM-CONTACT-CARD] Fetching contact details for: ${id}`);
        // Get contact with associated application data using existing schema
        const contactQuery = await db.execute(sql `
      SELECT 
        c.id,
        c.full_name,
        c.email,
        c.phone,
        c.company_name,
        c.applicationId,
        c.role,
        c.createdAt,
        c.updatedAt,
        a.id as app_id,
        a.stage,
        a.status as application_status,
        a.requested_amount,
        a.submitted_at,
        a.form_data
      FROM contacts c
      LEFT JOIN applications a ON c.applicationId = a.id
      WHERE c.id = ${id}
      LIMIT 1
    `);
        const contactData = contactQuery.rows;
        if (contactData.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found'
            });
        }
        const contactRow = contactData[0];
        const contact = {
            id: contactRow.id,
            name: contactRow.full_name || contactRow.email,
            firstName: contactRow.full_name?.split(' ')[0] || '',
            lastName: contactRow.full_name?.split(' ').slice(1).join(' ') || '',
            email: contactRow.email,
            phone: contactRow.phone,
            businessName: contactRow.company_name,
            applicationId: contactRow.applicationId,
            role: contactRow.role,
            source: 'application',
            status: 'active',
            createdAt: contactRow.createdAt,
            updatedAt: contactRow.updatedAt
        };
        const application = contactRow.app_id ? {
            id: contactRow.app_id,
            stage: contactRow.stage,
            status: contactRow.application_status,
            requestedAmount: contactRow.requested_amount,
            submittedAt: contactRow.submitted_at,
            formData: contactRow.form_data
        } : null;
        console.log(`✅ [CRM-CONTACT-CARD] Contact found: ${contact.name}`);
        res.json({
            success: true,
            contact,
            application,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ [CRM-CONTACT-CARD] Failed to fetch contact:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch contact details'
        });
    }
});
/**
 * GET /api/crm/contacts/:id/timeline
 * Get comprehensive timeline for contact (SMS, calls, emails, notes, system events)
 */
router.get('/:id/timeline', async (req, res) => {
    try {
        const { id } = req.params;
        const { type, limit = 50 } = req.query;
        console.log(`🔍 [CRM-TIMELINE] Fetching timeline for contact: ${id}, type: ${type || 'all'}`);
        // Build timeline from multiple sources
        const timelineItems = [];
        // Get contact logs
        const logs = await db
            .select()
            .from(contactLogs)
            .where(eq(contactLogs.contactId, id))
            .orderBy(desc(contactLogs.createdAt))
            .limit(parseInt(limit));
        logs.forEach(log => {
            timelineItems.push({
                id: log.id,
                type: log.type,
                direction: log.direction,
                content: log.content,
                staffUserId: log.staffUserId,
                metadata: log.metadata,
                timestamp: log.createdAt,
                source: 'contact_log'
            });
        });
        // Get notes if no type filter or type is 'note'
        if (!type || type === 'note') {
            const contactNotes = await db
                .select()
                .from(notes)
                .where(eq(notes.contactId, id))
                .orderBy(desc(notes.createdAt))
                .limit(parseInt(limit));
            contactNotes.forEach(note => {
                timelineItems.push({
                    id: note.id,
                    type: 'note',
                    direction: null,
                    content: note.content,
                    staffUserId: note.staffUserId,
                    metadata: { pinned: note.pinned, tags: note.tags },
                    timestamp: note.createdAt,
                    source: 'note'
                });
            });
        }
        // Get SMS messages if no type filter or type is 'sms'
        if (!type || type === 'sms') {
            const smsData = await db
                .select()
                .from(smsMessages)
                .where(eq(smsMessages.contactId, id))
                .orderBy(desc(smsMessages.createdAt))
                .limit(parseInt(limit));
            smsData.forEach(sms => {
                timelineItems.push({
                    id: sms.id,
                    type: 'sms',
                    direction: sms.direction,
                    content: sms.body,
                    staffUserId: sms.staffUserId,
                    metadata: {
                        status: sms.status,
                        twilioSid: sms.twilioMessageSid,
                        mediaUrls: sms.mediaUrls
                    },
                    timestamp: sms.createdAt,
                    source: 'sms'
                });
            });
        }
        // Get call logs if no type filter or type is 'call'
        if (!type || type === 'call') {
            const calls = await db
                .select()
                .from(callLogs)
                .where(eq(callLogs.contactId, id))
                .orderBy(desc(callLogs.createdAt))
                .limit(parseInt(limit));
            calls.forEach(call => {
                timelineItems.push({
                    id: call.id,
                    type: 'call',
                    direction: call.direction,
                    content: `Call ${call.status} - Duration: ${call.duration || 0}s`,
                    staffUserId: call.staffUserId,
                    metadata: {
                        status: call.status,
                        duration: call.duration,
                        recordingUrl: call.recordingUrl,
                        twilioSid: call.twilioCallSid
                    },
                    timestamp: call.startTime || call.createdAt,
                    source: 'call'
                });
            });
        }
        // Sort all timeline items by timestamp (newest first)
        timelineItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        console.log(`✅ [CRM-TIMELINE] Retrieved ${timelineItems.length} timeline items`);
        res.json({
            success: true,
            timeline: timelineItems.slice(0, parseInt(limit)),
            total: timelineItems.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ [CRM-TIMELINE] Failed to fetch timeline:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch contact timeline'
        });
    }
});
/**
 * POST /api/crm/contacts/:id/notes
 * Add a new note to contact
 */
router.post('/:id/notes', async (req, res) => {
    try {
        const { id } = req.params;
        const { content, pinned = false, isPrivate = false, tags = [] } = req.body;
        const staffUserId = req.user?.id || 'system'; // Get from auth middleware
        if (!content?.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Note content is required'
            });
        }
        console.log(`📝 [CRM-NOTE] Adding note to contact: ${id}`);
        const [newNote] = await db
            .insert(notes)
            .values({
            contactId: id,
            content: content.trim(),
            staffUserId,
            pinned,
            isPrivate,
            tags
        })
            .returning();
        // Also log this as a contact log entry
        await db
            .insert(contactLogs)
            .values({
            contactId: id,
            type: 'note',
            direction: null,
            content: `Note added: ${content.trim()}`,
            staffUserId,
            metadata: { noteId: newNote.id, pinned, tags }
        });
        console.log(`✅ [CRM-NOTE] Note added successfully: ${newNote.id}`);
        res.json({
            success: true,
            note: newNote,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ [CRM-NOTE] Failed to add note:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add note'
        });
    }
});
/**
 * POST /api/crm/contacts/:id/logs
 * Add a custom log entry to contact timeline
 */
router.post('/:id/logs', async (req, res) => {
    try {
        const { id } = req.params;
        const { type, direction, content, metadata = {} } = req.body;
        const staffUserId = req.user?.id || 'system';
        if (!type || !content) {
            return res.status(400).json({
                success: false,
                error: 'Type and content are required'
            });
        }
        console.log(`📋 [CRM-LOG] Adding ${type} log to contact: ${id}`);
        const [newLog] = await db
            .insert(contactLogs)
            .values({
            contactId: id,
            type,
            direction,
            content,
            staffUserId,
            metadata
        })
            .returning();
        console.log(`✅ [CRM-LOG] Log added successfully: ${newLog.id}`);
        res.json({
            success: true,
            log: newLog,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ [CRM-LOG] Failed to add log:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add log entry'
        });
    }
});
/**
 * GET /api/crm/contacts/:id/applications
 * Get all applications associated with this contact
 */
router.get('/:id/applications', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`🔍 [CRM-APPLICATIONS] Fetching applications for contact: ${id}`);
        const contactApplications = await db
            .select()
            .from(applications)
            .where(eq(applications.id, sql `(SELECT applicationId FROM contacts WHERE id = ${id})`))
            .orderBy(desc(applications.createdAt));
        console.log(`✅ [CRM-APPLICATIONS] Found ${contactApplications.length} applications`);
        res.json({
            success: true,
            applications: contactApplications,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ [CRM-APPLICATIONS] Failed to fetch applications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch applications'
        });
    }
});
/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'operational',
        service: 'CRM Contact Card Service',
        timestamp: new Date().toISOString()
    });
});
/**
 * GET /api/crm/contact-card (no ID) - Health check fallback
 */
router.get('/', (req, res) => {
    res.json({
        success: true,
        status: 'operational',
        service: 'CRM Contact Card Service',
        message: 'Please provide a contact ID to fetch contact details',
        timestamp: new Date().toISOString()
    });
});
// Debug: Log router creation
console.log('🔍 [CRM-CONTACT-CARD] Router created with', router.stack?.length || 0, 'routes');
export default router;
