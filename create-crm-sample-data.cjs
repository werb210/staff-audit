/**
 * CRM Sample Data Generation Script
 * Creates realistic contact, company, and deal data for CRM testing
 */

const { Pool, neonConfig } = require('@neondatabase/serverless');
const { v4: uuidv4 } = require('uuid');
const ws = require('ws');

// Configure Neon for server environment
neonConfig.webSocketConstructor = ws;

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Sample data arrays
const firstNames = [
  'James', 'Mary', 'Michael', 'Patricia', 'Robert', 'Jennifer', 'William', 'Linda',
  'David', 'Elizabeth', 'Richard', 'Barbara', 'Joseph', 'Susan', 'Thomas', 'Jessica',
  'Christopher', 'Sarah', 'Daniel', 'Karen', 'Paul', 'Nancy', 'Mark', 'Lisa',
  'Donald', 'Betty', 'Steven', 'Helen', 'Kenneth', 'Sandra', 'Andrew', 'Donna'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker'
];

const companyNames = [
  'TechFlow Solutions', 'Global Manufacturing Corp', 'Sunrise Consulting Group',
  'Elite Financial Services', 'Innovation Labs Inc', 'Premier Healthcare Systems',
  'Advanced Logistics LLC', 'Creative Design Studio', 'Strategic Marketing Partners',
  'Quantum Technologies', 'Nexus Retail Solutions', 'Pinnacle Construction Co',
  'Digital Commerce Hub', 'Meridian Energy Solutions', 'Apex Software Development',
  'Sterling Investment Group', 'Vertex Communications', 'Catalyst Media Group',
  'Horizon Data Systems', 'Phoenix Trading Company'
];

const industries = [
  'Technology', 'Manufacturing', 'Healthcare', 'Finance', 'Retail', 'Construction',
  'Energy', 'Transportation', 'Education', 'Real Estate', 'Media', 'Consulting'
];

const dealStages = ['new', 'in_review', 'requires_docs', 'off_to_lender', 'accepted', 'denied'];

const dealTypes = [
  'Working Capital Loan', 'Equipment Financing', 'Line of Credit', 'Term Loan',
  'Invoice Factoring', 'Merchant Cash Advance', 'Real Estate Loan', 'SBA Loan'
];

// Utility functions
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomAmount(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhoneNumber() {
  const areaCode = randomAmount(200, 999);
  const exchange = randomAmount(200, 999);
  const number = randomAmount(1000, 9999);
  return `${areaCode}-${exchange}-${number}`;
}

function generateEmail(firstName, lastName, company) {
  const domain = company.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}.com`;
}

// Sample data generation functions
async function createSampleCompanies() {
  console.log('Creating sample companies...');
  const companies = [];
  
  for (let i = 0; i < 25; i++) {
    const company = {
      id: uuidv4(),
      name: randomChoice(companyNames),
      industry: randomChoice(industries),
      size: randomChoice(['1-10', '11-50', '51-200', '201-1000', '1000+']),
      revenue: randomAmount(100000, 50000000),
      phone: generatePhoneNumber(),
      website: `www.${randomChoice(companyNames).toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      address: `${randomAmount(100, 9999)} ${randomChoice(['Main', 'Oak', 'Pine', 'Cedar', 'Elm'])} St`,
      city: randomChoice(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia']),
      state: randomChoice(['NY', 'CA', 'IL', 'TX', 'AZ', 'PA']),
      zipCode: randomAmount(10000, 99999).toString(),
      tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      createdAt: new Date(Date.now() - randomAmount(1, 365) * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    };
    companies.push(company);
  }
  
  // Insert companies
  for (const company of companies) {
    await pool.query(`
      INSERT INTO crm_companies (
        id, name, industry, size, revenue, phone, website, address, city, state, zip_code, tenant_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO NOTHING
    `, [
      company.id, company.name, company.industry, company.size, company.revenue,
      company.phone, company.website, company.address, company.city, company.state,
      company.zipCode, company.tenantId, company.createdAt, company.updatedAt
    ]);
  }
  
  console.log(`✓ Created ${companies.length} companies`);
  return companies;
}

async function createSampleContacts(companies) {
  console.log('Creating sample contacts...');
  const contacts = [];
  
  for (let i = 0; i < 60; i++) {
    const firstName = randomChoice(firstNames);
    const lastName = randomChoice(lastNames);
    const company = randomChoice(companies);
    
    const contact = {
      id: uuidv4(),
      firstName,
      lastName,
      email: generateEmail(firstName, lastName, company.name),
      phone: generatePhoneNumber(),
      title: randomChoice(['CEO', 'CFO', 'VP Finance', 'Controller', 'Owner', 'Manager', 'Director']),
      companyId: company.id,
      source: randomChoice(['Website', 'Referral', 'Cold Call', 'LinkedIn', 'Email Campaign', 'Trade Show']),
      status: randomChoice(['active', 'prospect', 'customer', 'inactive']),
      notes: `Initial contact established. Interested in ${randomChoice(dealTypes.map(t => t.toLowerCase()))}.`,
      tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      createdAt: new Date(Date.now() - randomAmount(1, 180) * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    };
    contacts.push(contact);
  }
  
  // Insert contacts
  for (const contact of contacts) {
    await pool.query(`
      INSERT INTO crm_contacts (
        id, first_name, last_name, email, phone, title, company_id, source, status, notes, tenant_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO NOTHING
    `, [
      contact.id, contact.firstName, contact.lastName, contact.email, contact.phone,
      contact.title, contact.companyId, contact.source, contact.status, contact.notes,
      contact.tenantId, contact.createdAt, contact.updatedAt
    ]);
  }
  
  console.log(`✓ Created ${contacts.length} contacts`);
  return contacts;
}

async function createSampleDeals(contacts, companies) {
  console.log('Creating sample deals...');
  const deals = [];
  
  for (let i = 0; i < 35; i++) {
    const contact = randomChoice(contacts);
    const company = companies.find(c => c.id === contact.companyId);
    const dealType = randomChoice(dealTypes);
    const amount = randomAmount(25000, 2000000);
    
    const deal = {
      id: uuidv4(),
      title: `${dealType} - ${company.name}`,
      amount,
      stage: randomChoice(dealStages),
      probability: randomAmount(10, 90),
      expectedCloseDate: new Date(Date.now() + randomAmount(7, 120) * 24 * 60 * 60 * 1000),
      contactId: contact.id,
      companyId: company.id,
      dealType,
      status: randomChoice(['active', 'won', 'lost', 'on_hold']),
      description: `${dealType} opportunity for ${company.name}. Amount: $${amount.toLocaleString()}`,
      tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      createdAt: new Date(Date.now() - randomAmount(1, 90) * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    };
    deals.push(deal);
  }
  
  // Insert deals
  for (const deal of deals) {
    await pool.query(`
      INSERT INTO crm_deals (
        id, title, amount, stage, probability, expected_close_date, contact_id, company_id, 
        deal_type, status, description, tenant_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO NOTHING
    `, [
      deal.id, deal.title, deal.amount, deal.stage, deal.probability, deal.expectedCloseDate,
      deal.contactId, deal.companyId, deal.dealType, deal.status, deal.description,
      deal.tenantId, deal.createdAt, deal.updatedAt
    ]);
  }
  
  console.log(`✓ Created ${deals.length} deals`);
  return deals;
}

async function createSampleTasks(contacts, deals) {
  console.log('Creating sample tasks...');
  const tasks = [];
  
  const taskTypes = [
    'Follow up call', 'Send proposal', 'Schedule meeting', 'Collect documents',
    'Review application', 'Contact references', 'Prepare presentation', 'Send contract'
  ];
  
  for (let i = 0; i < 50; i++) {
    const contact = randomChoice(contacts);
    const deal = randomChoice(deals.filter(d => d.contactId === contact.id)) || randomChoice(deals);
    
    const task = {
      id: uuidv4(),
      title: randomChoice(taskTypes),
      description: `${randomChoice(taskTypes)} for ${contact.firstName} ${contact.lastName} at ${deal.title}`,
      status: randomChoice(['pending', 'in_progress', 'completed', 'cancelled']),
      priority: randomChoice(['low', 'medium', 'high', 'urgent']),
      dueDate: new Date(Date.now() + randomAmount(-7, 30) * 24 * 60 * 60 * 1000),
      assignedTo: '5cfef28a-b9f2-4bc3-8f18-05521058890e', // Admin user ID
      contactId: contact.id,
      dealId: deal.id,
      tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      createdAt: new Date(Date.now() - randomAmount(1, 30) * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    };
    tasks.push(task);
  }
  
  // Insert tasks
  for (const task of tasks) {
    await pool.query(`
      INSERT INTO crm_tasks (
        id, title, description, status, priority, due_date, assigned_to, contact_id, deal_id, tenant_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING
    `, [
      task.id, task.title, task.description, task.status, task.priority, task.dueDate,
      task.assignedTo, task.contactId, task.dealId, task.tenantId, task.createdAt, task.updatedAt
    ]);
  }
  
  console.log(`✓ Created ${tasks.length} tasks`);
  return tasks;
}

async function createSampleActivityFeed(contacts, deals, tasks) {
  console.log('Creating sample activity feed...');
  const activities = [];
  
  const activityTypes = [
    'contact_created', 'deal_created', 'task_completed', 'email_sent', 'call_made',
    'meeting_scheduled', 'document_uploaded', 'note_added', 'stage_changed'
  ];
  
  for (let i = 0; i < 100; i++) {
    const activityType = randomChoice(activityTypes);
    const contact = randomChoice(contacts);
    let description = '';
    
    switch (activityType) {
      case 'contact_created':
        description = `New contact ${contact.firstName} ${contact.lastName} was added`;
        break;
      case 'deal_created':
        const deal = randomChoice(deals.filter(d => d.contactId === contact.id)) || randomChoice(deals);
        description = `New deal "${deal.title}" was created`;
        break;
      case 'task_completed':
        const task = randomChoice(tasks.filter(t => t.contactId === contact.id)) || randomChoice(tasks);
        description = `Task "${task.title}" was completed`;
        break;
      case 'email_sent':
        description = `Email sent to ${contact.firstName} ${contact.lastName}`;
        break;
      case 'call_made':
        description = `Phone call made to ${contact.firstName} ${contact.lastName}`;
        break;
      default:
        description = `${activityType.replace('_', ' ')} for ${contact.firstName} ${contact.lastName}`;
    }
    
    const activity = {
      id: uuidv4(),
      type: activityType,
      description,
      userId: '5cfef28a-b9f2-4bc3-8f18-05521058890e', // Admin user ID
      contactId: contact.id,
      metadata: JSON.stringify({ source: 'sample_data' }),
      tenantId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      createdAt: new Date(Date.now() - randomAmount(1, 60) * 24 * 60 * 60 * 1000)
    };
    activities.push(activity);
  }
  
  // Insert activities
  for (const activity of activities) {
    await pool.query(`
      INSERT INTO crm_activities (
        id, type, description, user_id, contact_id, metadata, tenant_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [
      activity.id, activity.type, activity.description, activity.userId,
      activity.contactId, activity.metadata, activity.tenantId, activity.createdAt
    ]);
  }
  
  console.log(`✓ Created ${activities.length} activities`);
  return activities;
}

async function createCrmSampleData() {
  try {
    console.log('🚀 Starting CRM sample data creation...\n');
    
    // Create tables if they don't exist
    await ensureCrmTables();
    
    // Create sample data in order
    const companies = await createSampleCompanies();
    const contacts = await createSampleContacts(companies);
    const deals = await createSampleDeals(contacts, companies);
    const tasks = await createSampleTasks(contacts, deals);
    const activities = await createSampleActivityFeed(contacts, deals, tasks);
    
    console.log('\n✅ CRM Sample Data Creation Complete!');
    console.log(`📊 Summary:`);
    console.log(`   • ${companies.length} companies`);
    console.log(`   • ${contacts.length} contacts`);
    console.log(`   • ${deals.length} deals`);
    console.log(`   • ${tasks.length} tasks`);
    console.log(`   • ${activities.length} activities`);
    console.log('\n🎯 Ready for CRM testing and development!');
    
  } catch (error) {
    console.error('❌ Error creating CRM sample data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function ensureCrmTables() {
  console.log('Ensuring CRM tables exist...');
  
  // Create CRM tables if they don't exist
  const queries = [
    `CREATE TABLE IF NOT EXISTS crm_companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      industry VARCHAR(100),
      size VARCHAR(50),
      revenue INTEGER,
      phone VARCHAR(20),
      website VARCHAR(255),
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(10),
      zip_code VARCHAR(20),
      tenant_id UUID NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS crm_contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE,
      phone VARCHAR(20),
      title VARCHAR(100),
      company_id UUID REFERENCES crm_companies(id),
      source VARCHAR(100),
      status VARCHAR(50) DEFAULT 'active',
      notes TEXT,
      tenant_id UUID NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS crm_deals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      amount INTEGER,
      stage VARCHAR(50) DEFAULT 'new',
      probability INTEGER DEFAULT 0,
      expected_close_date DATE,
      contact_id UUID REFERENCES crm_contacts(id),
      company_id UUID REFERENCES crm_companies(id),
      deal_type VARCHAR(100),
      status VARCHAR(50) DEFAULT 'active',
      description TEXT,
      tenant_id UUID NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS crm_tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      priority VARCHAR(20) DEFAULT 'medium',
      due_date TIMESTAMP,
      assigned_to UUID,
      contact_id UUID REFERENCES crm_contacts(id),
      deal_id UUID REFERENCES crm_deals(id),
      tenant_id UUID NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS crm_activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      user_id UUID NOT NULL,
      contact_id UUID REFERENCES crm_contacts(id),
      deal_id UUID REFERENCES crm_deals(id),
      metadata JSONB,
      tenant_id UUID NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`
  ];
  
  for (const query of queries) {
    await pool.query(query);
  }
  
  console.log('✓ CRM tables ready');
}

// Run the script
if (require.main === module) {
  createCrmSampleData();
}

module.exports = { createCrmSampleData };