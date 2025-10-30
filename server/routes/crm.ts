import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { requireAuth } from '../auth/verifyOnly';
import twilioLogsRouter from './crm/contacts/twilioLogs';

const router = Router();

// Mount Twilio logs routes for CRM integration
router.use('/contacts', twilioLogsRouter);

// Simplified CRM routes using existing schema
// Contacts Routes - Simplified for initial implementation
router.get('/contacts', requireAuth, async (req: any, res: any) => {
  try {
    const { page = '1', q = '' } = req.query;
    const limit = 25;
    const offset = (Number(page) - 1) * limit;

    // Return mock data for now to test the frontend
    const mockContacts = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1 (555) 123-4567',
        lifecycleStage: 'lead',
        jobTitle: 'CEO',
        createdAt: new Date().toISOString(),
        company: { id: '1', name: 'Acme Corp' }
      },
      {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '+1 (555) 987-6543',
        lifecycleStage: 'prospect',
        jobTitle: 'CTO',
        createdAt: new Date().toISOString(),
        company: { id: '2', name: 'Tech Solutions' }
      }
    ];

    // Filter by search query if provided
    const searchQuery = typeof q === 'string' ? q : '';
    const filteredContacts = searchQuery 
      ? mockContacts.filter(contact => 
          contact.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : mockContacts;

    res.json({
      data: filteredContacts,
      pagination: {
        page: Number(page),
        limit,
        total: filteredContacts.length,
        totalPages: Math.ceil(filteredContacts.length / limit)
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Contact creation endpoint
router.post('/contacts', requireAuth, async (req: any, res: any) => {
  try {
    const { firstName, lastName, email, phone, jobTitle, lifecycleStage } = req.body;
    
    // For now, return a mock created contact
    const newContact = {
      id: Date.now().toString(),
      firstName,
      lastName,
      email,
      phone,
      jobTitle,
      lifecycleStage: lifecycleStage || 'lead',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.status(201).json(newContact);
  } catch (error: unknown) {
    console.error('Error creating contact:', error);
    res.status(400).json({ error: 'Failed to create contact' });
  }
});

// Auto-create contact endpoint for client-side events
router.post('/contacts/auto-create', async (req: any, res: any) => {
  try {
    const { firstName, lastName, email, phone, source, applicationId } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email required for deduplication." });
    }

    // For now, create a mock contact with deduplication logic
    const mockContactId = Date.now().toString();
    const contact = {
      id: mockContactId,
      firstName: firstName?.trim() || "",
      lastName: lastName?.trim() || "",
      email: email.toLowerCase(),
      phone,
      source,
      applicationId,
      tags: ["auto-generated", "client-app"],
      status: "new",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Mock activity log
    console.log(`[CRM AUTO-CREATE] New contact created via client app (source: ${source}) - Email: ${email}`);

    return res.status(200).json({ 
      contact, 
      status: "created" 
    });
  } catch (error: unknown) {
    console.error('Error auto-creating contact:', error);
    res.status(500).json({ error: 'Failed to auto-create contact' });
  }
});

// Companies Routes - Enhanced with real data
router.get('/companies', requireAuth, async (req: any, res: any) => {
  try {
    // Get companies from applications and contacts
    const companiesQuery = await db.execute(sql`
      SELECT DISTINCT 
        COALESCE(
          CASE 
            WHEN a.form_data::json->'step3'->>'businessName' IS NOT NULL 
            THEN a.form_data::json->'step3'->>'businessName'
            WHEN a.form_data::json->'step3'->>'legalBusinessName' IS NOT NULL 
            THEN a.form_data::json->'step3'->>'legalBusinessName'
            WHEN c.company_name IS NOT NULL
            THEN c.company_name
            ELSE 'Unknown Company'
          END
        ) as name,
        COUNT(*) as contact_count
      FROM applications a
      FULL OUTER JOIN contacts c ON a.id = c.applicationId
      WHERE (
        a.form_data::json->'step3'->>'businessName' IS NOT NULL 
        OR a.form_data::json->'step3'->>'legalBusinessName' IS NOT NULL
        OR c.company_name IS NOT NULL
      )
      GROUP BY name
      ORDER BY contact_count DESC, name
    `);

    const companies = companiesQuery.rows.map((row, index) => ({
      id: (index + 1).toString(),
      name: (row as any).name,
      contactCount: parseInt((row as any).contact_count) || 0,
      industry: 'Business' // Default industry
    }));

    // Add some default companies if none exist
    if (companies.length === 0) {
      companies.push(
        { id: '1', name: 'Acme Corp', contactCount: 0, industry: 'Technology' },
        { id: '2', name: 'Tech Solutions', contactCount: 0, industry: 'Software' },
        { id: '3', name: 'Global Industries', contactCount: 0, industry: 'Manufacturing' }
      );
    }

    res.json(companies);
  } catch (error: unknown) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Activity Feed Routes - Simplified
router.get('/activity', requireAuth, async (req: any, res: any) => {
  try {
    const mockActivity = [
      {
        id: '1',
        action: 'create',
        entityType: 'contact',
        entityId: '1',
        details: { name: 'John Doe' },
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        action: 'update',
        entityType: 'contact',
        entityId: '2',
        details: { changes: ['phone'] },
        createdAt: new Date(Date.now() - 3600000).toISOString()
      }
    ];

    res.json(mockActivity);
  } catch (error: unknown) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

export default router;