/**
 * Create Default Business Record for Draft Applications
 * Creates a default business record to satisfy foreign key constraints
 */

const { neonConfig, Pool } = require('@neondatabase/serverless');
const ws = require("ws");

neonConfig.webSocketConstructor = ws;

async function createDefaultBusiness() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // First, create a default tenant if it doesn't exist
    const defaultTenantId = '00000000-0000-0000-0000-000000000000';
    await pool.query(`
      INSERT INTO tenants (id, name, domain)
      VALUES ($1, 'Default Tenant', 'default.local')
      ON CONFLICT (id) DO NOTHING
    `, [defaultTenantId]);
    
    // Create a default user if it doesn't exist
    const defaultUserId = '00000000-0000-0000-0000-000000000001';
    await pool.query(`
      INSERT INTO users (id, username, email, password_hash, first_name, last_name, role, tenant_id, phone)
      VALUES ($1, 'default-user', 'default@example.com', 'hash', 'Default', 'User', 'client', $2, '+15555551234')
      ON CONFLICT (id) DO NOTHING
    `, [defaultUserId, defaultTenantId]);
    
    // Create default business
    const defaultBusinessId = '00000000-0000-0000-0000-000000000001';
    await pool.query(`
      INSERT INTO businesses (id, user_id, tenant_id, business_name, business_type, industry, phone, address)
      VALUES ($1, $2, $3, 'Default Business', 'Default', 'Default', '', '{}')
      ON CONFLICT (id) DO NOTHING
    `, [defaultBusinessId, defaultUserId, defaultTenantId]);
    
    console.log('✅ Default business, user, and tenant created successfully');
    
  } catch (error) {
    console.error('Error creating default business:', error.message);
    console.error('Details:', error);
  } finally {
    await pool.end();
  }
}

createDefaultBusiness();
