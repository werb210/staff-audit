#!/usr/bin/env node

/**
 * CRITICAL: Test CRM Auto-Creation Fix
 * This script tests the CRM auto-creation function for Application c6c52525
 */

const { autoCreateContactsFromApplication } = require('./server/services/crmService.js');

async function testCrmAutoCreation() {
  console.log('🧪 TESTING CRM AUTO-CREATION FOR APPLICATION c6c52525');
  console.log('=======================================================');
  
  const applicationData = {
    id: 'c6c52525-6c90-4a49-83fa-e9d2c218e534',
    firstName: 'Bob',
    lastName: 'Bob',
    email: 'Bob@bob.com',
    phone: '213456789',
    businessName: 'A1',
    formData: {
      step3: {
        businessName: 'A1',
        businessType: 'Corporation',
        businessEmail: 'Bob@bob.com',
        businessPhone: '+12134567899',
        legalBusinessName: 'A1'
      },
      step4: {
        firstName: 'Bob',
        lastName: 'Bob',
        email: 'Bob@bob.com',
        phone: '213456789',
        ownershipPercentage: 100
      }
    }
  };
  
  try {
    console.log('📋 Application Data:', JSON.stringify(applicationData, null, 2));
    
    await autoCreateContactsFromApplication(applicationData);
    
    console.log('✅ CRM auto-creation completed successfully!');
    
    // Check if contacts were created
    const { db } = await import('./server/db.js');
    const { sql } = await import('drizzle-orm');
    
    const contacts = await db.execute(sql`
      SELECT full_name, email, role, company_name, application_id 
      FROM contacts 
      WHERE application_id = ${applicationData.id}
    `);
    
    console.log('📞 CONTACTS CREATED:', contacts.rows);
    
  } catch (error) {
    console.error('❌ CRM auto-creation failed:', error);
    console.error('❌ Error details:', error.stack);
  }
}

testCrmAutoCreation().catch(console.error);