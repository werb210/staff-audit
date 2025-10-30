import { Router } from 'express';

const router = Router();

// Seed contacts for testing
router.post('/seed', (req: any, res: any) => {
  const seedContacts = [
    {
      id: 'ct-bf-001',
      tenant_id: 'bf',
      first_name: 'Maya',
      last_name: 'Thompson', 
      email: 'maya@acme.com',
      phone: '+15551230001',
      company: 'Acme Manufacturing',
      lifecycle_stage: 'Lead',
      tags: ['priority', 'manufacturing'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'ct-bf-002',
      tenant_id: 'bf',
      first_name: 'Leo',
      last_name: 'Martinez',
      email: 'leo@quickmart.biz',
      phone: '+15551230002', 
      company: 'Quick Mart LLC',
      lifecycle_stage: 'Lead',
      tags: ['retail'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'ct-bf-003',
      tenant_id: 'bf',
      first_name: 'Ava',
      last_name: 'Chen',
      email: 'ava@denvercon.com',
      phone: '+15551230003',
      company: 'Denver Construction', 
      lifecycle_stage: 'Lead',
      tags: ['construction'],
      createdAt: new Date().toISOString()
    }
  ];

  res.json({ 
    success: true, 
    contacts: seedContacts,
    message: 'Seed contacts created successfully'
  });
});

// Enhanced contacts endpoint with proper data structure
router.get('/', (req: any, res: any) => {
  const contacts = [
    {
      id: 'ct-bf-001',
      name: 'Maya Thompson',
      email: 'maya@acme.com',
      phone_e164: '+15551230001',
      mobile_e164: '+15551230001',
      company: 'Acme Manufacturing',
      amount_requested: 250000,
      lead_status: 'Lead',
      createdAt: '2024-08-20T10:00:00Z',
      last_activity: '2024-08-21T09:30:00Z',
      tags: ['priority', 'manufacturing'],
      lifecycle_stage: 'Lead'
    },
    {
      id: 'ct-bf-002', 
      name: 'Leo Martinez',
      email: 'leo@quickmart.biz',
      phone_e164: '+15551230002',
      mobile_e164: '+15551230002',
      company: 'Quick Mart LLC',
      amount_requested: 75000,
      lead_status: 'Lead',
      createdAt: '2024-08-19T14:20:00Z',
      last_activity: '2024-08-21T08:15:00Z',
      tags: ['retail'],
      lifecycle_stage: 'Lead'
    },
    {
      id: 'ct-bf-003',
      name: 'Ava Chen', 
      email: 'ava@denvercon.com',
      phone_e164: '+15551230003',
      mobile_e164: '+15551230003',
      company: 'Denver Construction',
      amount_requested: 125000,
      lead_status: 'Lead',
      createdAt: '2024-08-18T16:45:00Z',
      last_activity: '2024-08-20T17:20:00Z',
      tags: ['construction'],
      lifecycle_stage: 'Lead'
    }
  ];

  res.json({ 
    ok: true, 
    items: contacts, 
    count: contacts.length, 
    total: contacts.length 
  });
});

// Contact details for HubSpot-style card
router.get('/:id', (req: any, res: any) => {
  const { id } = req.params;
  
  const contactDetails = {
    'ct-bf-001': {
      id: 'ct-bf-001',
      name: 'Maya Thompson',
      first_name: 'Maya',
      last_name: 'Thompson',
      email: 'maya@acme.com',
      phone_e164: '+15551230001',
      company: 'Acme Manufacturing',
      title: 'Operations Manager',
      amount_requested: 250000,
      lead_status: 'Lead',
      lifecycle_stage: 'Lead',
      tags: ['priority', 'manufacturing'],
      createdAt: '2024-08-20T10:00:00Z',
      last_activity: '2024-08-21T09:30:00Z',
      activity_timeline: [
        {
          id: 'act_1',
          type: 'call',
          description: 'Outbound call - discussed equipment financing needs',
          timestamp: '2024-08-21T09:30:00Z',
          duration: 420,
          outcome: 'completed'
        },
        {
          id: 'act_2', 
          type: 'email',
          description: 'Sent rate sheet and application form',
          timestamp: '2024-08-20T15:20:00Z',
          opened: true,
          clicked: true
        }
      ],
      deals: [
        {
          id: 'app-bf-001',
          title: 'Manufacturing Equipment Financing',
          amount: 250000,
          stage: 'In Review',
          probability: 75
        }
      ]
    },
    'ct-bf-002': {
      id: 'ct-bf-002',
      name: 'Leo Martinez',
      first_name: 'Leo',
      last_name: 'Martinez', 
      email: 'leo@quickmart.biz',
      phone_e164: '+15551230002',
      company: 'Quick Mart LLC',
      title: 'Owner',
      amount_requested: 75000,
      lead_status: 'Lead',
      lifecycle_stage: 'Lead',
      tags: ['retail'],
      createdAt: '2024-08-19T14:20:00Z',
      last_activity: '2024-08-21T08:15:00Z',
      activity_timeline: [
        {
          id: 'act_3',
          type: 'sms',
          description: 'Initial outreach - interested in working capital',
          timestamp: '2024-08-21T08:15:00Z',
          direction: 'inbound'
        }
      ],
      deals: [
        {
          id: 'app-bf-002',
          title: 'Working Capital Line',
          amount: 75000,
          stage: 'Requires Docs',
          probability: 50
        }
      ]
    },
    'ct-bf-003': {
      id: 'ct-bf-003',
      name: 'Ava Chen',
      first_name: 'Ava',
      last_name: 'Chen',
      email: 'ava@denvercon.com', 
      phone_e164: '+15551230003',
      company: 'Denver Construction',
      title: 'CFO',
      amount_requested: 125000,
      lead_status: 'Lead',
      lifecycle_stage: 'Lead',
      tags: ['construction'],
      createdAt: '2024-08-18T16:45:00Z',
      last_activity: '2024-08-20T17:20:00Z',
      activity_timeline: [
        {
          id: 'act_4',
          type: 'email',
          description: 'Introduction email sent',
          timestamp: '2024-08-20T17:20:00Z',
          opened: true,
          clicked: false
        }
      ],
      deals: [
        {
          id: 'app-bf-003',
          title: 'Construction Equipment Financing',
          amount: 125000,
          stage: 'New',
          probability: 25
        }
      ]
    }
  };

  const contact = contactDetails[id];
  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  res.json(contact);
});

export default router;