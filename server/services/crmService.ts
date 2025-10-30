/**
 * 🏢 CRM SERVICE - AUTO-CONTACT CREATION
 * 
 * Automatically creates CRM contacts when applications are submitted
 * Handles applicant and partner contact generation with proper linking
 * 
 * Created: July 26, 2025
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

interface ContactInput {
  fullName: string;
  email: string;
  phone?: string;
  role: 'Applicant' | 'Partner';
  companyName?: string;
  applicationId?: string;
}

interface ApplicationData {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  partnerFirstName?: string;
  partnerLastName?: string;
  partnerEmail?: string;
  partnerPhone?: string;
  formData?: any;
}

/**
 * Auto-create CRM contacts from application submission
 * Creates applicant and partner contacts with proper linking
 */
export async function autoCreateContactsFromApplication(appData: ApplicationData): Promise<void> {
  try {
    console.log(`🏢 [CRM] Auto-creating contacts for application ${appData.id}`);
    
    const contacts: ContactInput[] = [];
    
    // Extract data from form_data if available
    const step3 = appData.formData?.step3 || {};
    const step4 = appData.formData?.step4 || {};
    
    // Primary applicant contact
    const applicantFirstName = step4.firstName || appData.firstName || 'Unknown';
    const applicantLastName = step4.lastName || appData.lastName || '';
    const applicantEmail = step4.email || step3.businessEmail || appData.email;
    const applicantPhone = step4.phone || step3.businessPhone || appData.phone;
    const businessName = step3.businessName || appData.businessName;
    
    if (applicantEmail) {
      contacts.push({
        fullName: `${applicantFirstName} ${applicantLastName}`.trim(),
        email: applicantEmail,
        phone: applicantPhone,
        role: 'Applicant',
        companyName: businessName,
        applicationId: appData.id
      });
      
      console.log(`👤 [CRM] Applicant contact: ${applicantFirstName} ${applicantLastName} (${applicantEmail})`);
    }
    
    // Partner contact (if provided)
    const partnerFirstName = step4.partnerFirstName || appData.partnerFirstName;
    const partnerLastName = step4.partnerLastName || appData.partnerLastName;
    const partnerEmail = step4.partnerEmail || appData.partnerEmail;
    const partnerPhone = step4.partnerPhone || appData.partnerPhone;
    
    if (partnerFirstName && partnerEmail) {
      contacts.push({
        fullName: `${partnerFirstName} ${partnerLastName || ''}`.trim(),
        email: partnerEmail,
        phone: partnerPhone,
        role: 'Partner',
        companyName: businessName,
        applicationId: appData.id
      });
      
      console.log(`👥 [CRM] Partner contact: ${partnerFirstName} ${partnerLastName || ''} (${partnerEmail})`);
    }
    
    // Create contacts in database
    for (const contact of contacts) {
      try {
        // Check if contact already exists
        const existingContact = await db.execute(sql`
          SELECT id FROM contacts 
          WHERE email = ${contact.email} 
          AND applicationId = ${contact.applicationId}
          LIMIT 1
        `);
        
        if (existingContact.rows.length === 0) {
          // Create new contact
          await db.execute(sql`
            INSERT INTO contacts (
              full_name, 
              email, 
              phone, 
              role, 
              company_name, 
              applicationId,
              createdAt
            ) VALUES (
              ${contact.fullName},
              ${contact.email},
              ${contact.phone || null},
              ${contact.role},
              ${contact.companyName},
              ${contact.applicationId},
              NOW()
            )
          `);
          
          console.log(`✅ [CRM] Contact created: ${contact.email} (${contact.role})`);
        } else {
          console.log(`ℹ️ [CRM] Contact already exists: ${contact.email}`);
        }
      } catch (contactError) {
        console.error(`❌ [CRM] Failed to create contact ${contact.email}:`, contactError);
      }
    }
    
    console.log(`🏢 [CRM] Auto-contact creation completed for application ${appData.id}`);
    
  } catch (error) {
    console.error(`❌ [CRM] Auto-contact creation failed for application ${appData.id}:`, error);
  }
}

/**
 * Get all CRM contacts with enhanced data
 */
export async function getAllContacts(): Promise<any[]> {
  try {
    const contactsQuery = await db.execute(sql`
      SELECT 
        c.*,
        a.requested_amount,
        a.stage,
        a.status,
        COALESCE(
          CASE 
            WHEN a.form_data::json->'step3'->>'businessName' IS NOT NULL 
            THEN a.form_data::json->'step3'->>'businessName'
            WHEN a.form_data::json->'step3'->>'legalBusinessName' IS NOT NULL 
            THEN a.form_data::json->'step3'->>'legalBusinessName'
            ELSE 'Business Name Not Available'
          END
        ) as business_name
      FROM contacts c
      LEFT JOIN applications a ON c.applicationId = a.id
      ORDER BY c.createdAt DESC
    `);
    
    return contactsQuery.rows || [];
  } catch (error) {
    console.error('❌ [CRM] Failed to fetch contacts:', error);
    return [];
  }
}

/**
 * Create contacts table if it doesn't exist
 */
export async function ensureContactsTable(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        role VARCHAR(50) NOT NULL DEFAULT 'Applicant',
        company_name VARCHAR(255),
        applicationId UUID,
        source VARCHAR(50) DEFAULT 'application',
        status VARCHAR(50) DEFAULT 'active',
        job_title VARCHAR(255),
        createdAt TIMESTAMP DEFAULT NOW(),
        updatedAt TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Add missing columns if they don't exist
    await db.execute(sql`
      ALTER TABLE contacts 
      ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'application',
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS job_title VARCHAR(255)
    `);
    
    console.log('✅ [CRM] Contacts table ensured with all fields');
  } catch (error) {
    console.error('❌ [CRM] Failed to create contacts table:', error);
  }
}

/**
 * Create CRM contact from chat escalation (FIXED: Creates Contact not User)
 */
export async function autoCreateContactsFromChatEscalation(chatData: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  source: string;
  sessionId: string;
}): Promise<{ id: string }> {
  try {
    console.log(`💬 [CRM-CHAT] Creating Contact for chat escalation: ${chatData.firstName} ${chatData.lastName} (${chatData.email})`);
    
    // Check if contact already exists
    const existingContact = await db.execute(sql`
      SELECT id FROM contacts 
      WHERE email = ${chatData.email}
      LIMIT 1
    `);
    
    if (existingContact.rows.length > 0) {
      console.log(`ℹ️ [CRM-CHAT] Contact already exists: ${chatData.email}`);
      return { id: existingContact.rows[0].id as string };
    }
    
    // Create new contact in CONTACTS table (not users)
    const contactResult = await db.execute(sql`
      INSERT INTO contacts (
        full_name, 
        email, 
        phone, 
        role, 
        company_name,
        createdAt
      ) VALUES (
        ${`${chatData.firstName} ${chatData.lastName}`.trim()},
        ${chatData.email},
        ${chatData.phone || null},
        ${chatData.role},
        'Chat Lead Company',
        NOW()
      )
      RETURNING id
    `);
    
    const contactId = contactResult.rows[0]?.id;
    console.log(`✅ [CRM-CHAT] Contact created with ID: ${contactId} (table: contacts)`);
    
    return { id: contactId as string };
  } catch (error) {
    console.error(`❌ [CRM-CHAT] Failed to create contact for chat escalation:`, error);
    throw error;
  }
}

export default {
  autoCreateContactsFromApplication,
  autoCreateContactsFromChatEscalation,
  getAllContacts,
  ensureContactsTable
};