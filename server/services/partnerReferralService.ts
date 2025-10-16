import { db } from '../db';
import { contacts, leadSources, callLogs, contactLogs, users } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Partner Referral Service
 * Handles incoming calls from dedicated Twilio lines and creates contact cards
 * with proper source tracking and role-based access control
 */

// Configuration for Twilio number to source mapping
const TWILIO_SOURCE_MAPPING = {
  // Main business line (existing)
  '+17753146801': 'application',
  // Partner referral line (new dedicated line)
  '+17758889999': 'partner_referral', // This will be configured with actual Twilio number
} as const;

export interface IncomingCallData {
  To: string; // Destination Twilio number
  From: string; // Caller's phone number
  CallSid: string; // Twilio Call ID
  CallStatus?: string;
  Direction?: string;
  ForwardedFrom?: string;
}

/**
 * Process incoming call webhook from Twilio
 * Automatically creates Contact Card based on source mapping
 */
export async function processIncomingCall(callData: IncomingCallData) {
  console.log('📞 [PARTNER-REFERRAL] Processing incoming call:', callData);

  try {
    // Step 1: Determine source based on destination number
    const sourceType = TWILIO_SOURCE_MAPPING[callData.To as keyof typeof TWILIO_SOURCE_MAPPING] || 'direct_call';
    
    console.log(`🎯 [PARTNER-REFERRAL] Source determined: ${sourceType} for number ${callData.To}`);

    // Step 2: Look up or create lead source configuration
    let leadSource = await db
      .select()
      .from(leadSources)
      .where(eq(leadSources.twilioNumber, callData.To))
      .limit(1);

    if (!leadSource.length) {
      // Create default lead source if not exists
      const newLeadSource = await db
        .insert(leadSources)
        .values({
          name: sourceType === 'partner_referral' ? 'Partner Referral Line' : 'Main Business Line',
          sourceType: sourceType as any,
          twilioNumber: callData.To,
          defaultRole: sourceType === 'partner_referral' ? 'referral_agent' : 'staff',
          isActive: true,
          referralIdRequired: sourceType === 'partner_referral'
        })
        .returning();
      
      leadSource = newLeadSource;
      console.log('✅ [PARTNER-REFERRAL] Created new lead source:', newLeadSource[0]);
    }

    // Step 3: Check if contact already exists with this phone number
    const existingContact = await db
      .select()
      .from(contacts)
      .where(eq(contacts.phone, callData.From))
      .limit(1);

    let contactId: string;

    if (existingContact.length > 0) {
      // Update existing contact with latest call info
      contactId = existingContact[0].id;
      console.log(`👤 [PARTNER-REFERRAL] Found existing contact: ${contactId}`);
      
      // Update the contact to ensure it has the correct source if it was created differently
      if (existingContact[0].source !== sourceType) {
        await db
          .update(contacts)
          .set({ 
            source: sourceType as any,
            updatedAt: new Date()
          })
          .where(eq(contacts.id, contactId));
        
        console.log(`🔄 [PARTNER-REFERRAL] Updated contact source to: ${sourceType}`);
      }
    } else {
      // Create new contact card
      const newContact = await db
        .insert(contacts)
        .values({
          name: `Caller ${callData.From}`, // Temporary name until enriched
          phone: callData.From,
          source: sourceType as any,
          role: 'Prospect', // Default role for incoming calls
          status: 'unhandled', // Needs staff attention
        })
        .returning();

      contactId = newContact[0].id;
      console.log(`✅ [PARTNER-REFERRAL] Created new contact: ${contactId}`);
    }

    // Step 4: Log the call in call logs
    const callLog = await db
      .insert(callLogs)
      .values({
        contactId,
        twilioCallSid: callData.CallSid,
        fromNumber: callData.From,
        toNumber: callData.To,
        direction: 'inbound',
        status: callData.CallStatus || 'initiated',
        startTime: new Date(),
      })
      .returning();

    // Step 5: Create contact log entry for audit trail
    await db
      .insert(contactLogs)
      .values({
        contactId,
        type: 'call',
        direction: 'inbound',
        content: `Incoming call from ${callData.From} to ${sourceType === 'partner_referral' ? 'Partner Referral Line' : 'Main Line'}`,
        metadata: {
          callSid: callData.CallSid,
          source: sourceType,
          twilioNumber: callData.To,
          callStatus: callData.CallStatus
        }
      });

    console.log('✅ [PARTNER-REFERRAL] Call processed successfully');

    return {
      success: true,
      contactId,
      callLogId: callLog[0].id,
      source: sourceType,
      action: existingContact.length > 0 ? 'updated' : 'created'
    };

  } catch (error) {
    console.error('❌ [PARTNER-REFERRAL] Error processing incoming call:', error);
    throw error;
  }
}

/**
 * Get contacts filtered by role-based access control
 * ReferralAgent can only see partner_referral contacts
 * Admin can see all contacts
 */
export async function getContactsByRole(userRole: string, userId?: string) {
  console.log(`🔍 [PARTNER-REFERRAL] Fetching contacts for role: ${userRole}`);

  try {
    let whereCondition;

    switch (userRole) {
      case 'referral_agent':
        // Referral agents can only see partner_referral contacts
        whereCondition = eq(contacts.source, 'partner_referral');
        break;
      
      case 'admin':
      case 'staff':
        // Admin and staff can see all contacts
        whereCondition = undefined; // No filter
        break;
      
      default:
        // Other roles get no contacts
        return [];
    }

    const query = db.select().from(contacts);
    
    if (whereCondition) {
      query.where(whereCondition);
    }

    const results = await query.orderBy(contacts.createdAt);
    
    console.log(`✅ [PARTNER-REFERRAL] Found ${results.length} contacts for role ${userRole}`);
    
    return results;

  } catch (error) {
    console.error('❌ [PARTNER-REFERRAL] Error fetching contacts by role:', error);
    throw error;
  }
}

/**
 * Enrich contact with additional data from API source
 * Used when partner system sends more detailed information
 */
export async function enrichContactFromAPI(phone: string, enrichmentData: {
  name?: string;
  email?: string;
  businessName?: string;
  referralId?: string;
  jobTitle?: string;
}) {
  console.log(`🔄 [PARTNER-REFERRAL] Enriching contact for phone: ${phone}`);

  try {
    const contact = await db
      .select()
      .from(contacts)
      .where(eq(contacts.phone, phone))
      .limit(1);

    if (!contact.length) {
      console.log('❌ [PARTNER-REFERRAL] Contact not found for enrichment');
      return null;
    }

    // Update contact with enriched data
    const updatedContact = await db
      .update(contacts)
      .set({
        name: enrichmentData.name || contact[0].name,
        email: enrichmentData.email || contact[0].email,
        businessName: enrichmentData.businessName || contact[0].businessName,
        referralId: enrichmentData.referralId || contact[0].referralId,
        jobTitle: enrichmentData.jobTitle || contact[0].jobTitle,
        updatedAt: new Date()
      })
      .where(eq(contacts.id, contact[0].id))
      .returning();

    // Log the enrichment
    await db
      .insert(contactLogs)
      .values({
        contactId: contact[0].id,
        type: 'system',
        direction: null,
        content: 'Contact enriched with API data',
        metadata: {
          enrichmentData,
          source: 'api_enrichment'
        }
      });

    console.log('✅ [PARTNER-REFERRAL] Contact enriched successfully');
    
    return updatedContact[0];

  } catch (error) {
    console.error('❌ [PARTNER-REFERRAL] Error enriching contact:', error);
    throw error;
  }
}

/**
 * Get lead source configuration for dynamic routing
 */
export async function getLeadSources() {
  try {
    const sources = await db
      .select()
      .from(leadSources)
      .where(eq(leadSources.isActive, true))
      .orderBy(leadSources.createdAt);
    
    return sources;
  } catch (error) {
    console.error('❌ [PARTNER-REFERRAL] Error fetching lead sources:', error);
    throw error;
  }
}

/**
 * Initialize default lead sources
 * Called during startup to ensure proper configuration
 */
export async function initializeDefaultLeadSources() {
  console.log('🔧 [PARTNER-REFERRAL] Initializing default lead sources...');

  try {
    const existingSources = await getLeadSources();
    
    if (existingSources.length === 0) {
      // Create default sources
      await db.insert(leadSources).values([
        {
          name: 'Main Business Line',
          sourceType: 'application',
          twilioNumber: '+17753146801', // Replace with actual main number
          defaultRole: 'staff',
          isActive: true,
          referralIdRequired: false
        },
        {
          name: 'Partner Referral Line',
          sourceType: 'partner_referral',
          twilioNumber: '+17758889999', // Replace with actual partner number
          defaultRole: 'referral_agent',
          isActive: true,
          referralIdRequired: true
        }
      ]);
      
      console.log('✅ [PARTNER-REFERRAL] Default lead sources created');
    } else {
      console.log(`ℹ️ [PARTNER-REFERRAL] Found ${existingSources.length} existing lead sources`);
    }

  } catch (error) {
    console.error('❌ [PARTNER-REFERRAL] Error initializing lead sources:', error);
  }
}