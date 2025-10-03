import { db } from './server/db.js';
import { businesses, users, tenants } from './shared/schema.js';

async function fixDatabaseConstraints() {
  try {
    console.log('🔧 Creating default database records...');
    
    // Create default tenant if not exists
    await db.insert(tenants).values({
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Default Tenant',
      domain: 'default.localhost',
      isActive: true
    }).onConflictDoNothing();
    
    // Create default business if not exists
    await db.insert(businesses).values({
      id: '00000000-0000-0000-0000-000000000001',
      businessName: 'Default Business',
      businessType: 'LLC',
      industry: 'Technology',
      tenantId: '00000000-0000-0000-0000-000000000000'
    }).onConflictDoNothing();
    
    // Create default user if not exists
    await db.insert(users).values({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'default@system.local',
      firstName: 'Default',
      lastName: 'User',
      role: 'client',
      tenantId: '00000000-0000-0000-0000-000000000000',
      username: 'default',
      passwordHash: 'placeholder'
    }).onConflictDoNothing();
    
    console.log('✅ Default records created successfully');
    
  } catch (error) {
    console.error('Error creating default records:', error);
  }
}

fixDatabaseConstraints().catch(console.error);
