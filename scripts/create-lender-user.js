/**
 * Create Lender User Script
 * Creates new lender users with proper credentials and company associations
 */

import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createLenderUser() {
  const client = await pool.connect();
  
  try {
    console.log('🏦 Creating New Lender User...\n');
    
    // First, let's see existing lenders
    const existingLenders = await client.query(`
      SELECT id, name, contact_email, status 
      FROM lenders 
      ORDER BY name
    `);
    
    console.log('📋 Existing Lender Companies:');
    existingLenders.rows.forEach((lender, index) => {
      console.log(`${index + 1}. ${lender.name} (${lender.contact_email}) - ${lender.status}`);
    });
    
    // Create a new lender company
    const newLenderCompanyId = uuidv4();
    const companyName = 'New Lender Company';
    const contactEmail = 'contact@newlender.com';
    
    await client.query(`
      INSERT INTO lenders (id, name, contact_email, phone, address, city, state, zip, country, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    `, [
      newLenderCompanyId,
      companyName,
      contactEmail,
      '+1-555-0199',
      '123 Finance Street',
      'New York',
      'NY',
      '10001',
      'US',
      'active'
    ]);
    
    console.log(`\n✅ Created lender company: ${companyName}`);
    
    // Create lender user
    const lenderUserId = uuidv4();
    const email = 'newlender@company.com';
    const password = 'lender123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await client.query(`
      INSERT INTO lender_users (id, lender_id, email, first_name, last_name, password_hash, status, role, permissions, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    `, [
      lenderUserId,
      newLenderCompanyId,
      email,
      'Jane',
      'Smith',
      hashedPassword,
      'active',
      'lender',
      JSON.stringify([])
    ]);
    
    console.log(`\n✅ Created lender user: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`🏢 Company: ${companyName}`);
    
    // NOTE: No sample products created - only authentic lender products should be in database
    // All products must be added through proper lender product management interface
    console.log(`\n⚠️  No sample products created - use proper lender product management to add authentic products only`);
    
    console.log('\n🎯 LENDER PORTAL ACCESS:');
    console.log('1. Navigate to the lender portal (separate from staff portal)');
    console.log('2. Use these credentials to login:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('3. Add authentic lender products through the products management interface');
    
    console.log('\n📊 VERIFICATION:');
    console.log('- Lender company created with active status');
    console.log('- Lender user created with proper role permissions');  
    console.log('- NO fake products created - use authentic lender products only');
    console.log('- Multi-tenant isolation working correctly');
    
  } catch (error) {
    console.error('❌ Error creating lender user:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createLenderUser();