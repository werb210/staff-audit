import { db } from "../../db";
import { sql } from "drizzle-orm";

/**
 * Purge all data for a contact (RTBF compliance)
 */
export async function purgeContactData(contactId: string) {
  console.log(`[RTBF] Starting data purge for contact ${contactId}`);
  
  const results: any = { tables: {}, anonymized: {}, errors: [] };
  
  try {
    // 1. Delete communications
    try {
      const commResult = await db.execute(sql`
        DELETE FROM comm_messages WHERE contact_id = ${contactId}
      `);
      results.tables.comm_messages = commResult.rowsAffected || 0;
    } catch (error) {
      results.errors.push(`comm_messages: ${(error as Error).message}`);
    }
    
    // 2. Delete/anonymize applications
    try {
      // First get applications for this contact
      const apps = await db.execute(sql`
        SELECT id FROM applications WHERE contact_id = ${contactId}
      `);
      
      const appIds = (apps.rows || []).map(row => row.id);
      results.applications_found = appIds.length;
      
      if (appIds.length > 0) {
        // Delete related data
        await db.execute(sql`DELETE FROM documents WHERE application_id = ANY(${appIds})`);
        await db.execute(sql`DELETE FROM lender_activity WHERE application_id = ANY(${appIds})`);
        await db.execute(sql`DELETE FROM decision_traces WHERE application_id = ANY(${appIds})`);
        
        // Anonymize applications instead of deleting (for compliance)
        const anonResult = await db.execute(sql`
          UPDATE applications SET
            first_name = 'REDACTED',
            last_name = 'REDACTED', 
            email = 'redacted@example.com',
            phone = '+15555550000',
            ssn = '***-**-****',
            address = 'REDACTED',
            city = 'REDACTED',
            state = 'XX',
            zip = '00000',
            employer = 'REDACTED',
            updated_at = now()
          WHERE contact_id = ${contactId}
        `);
        results.anonymized.applications = anonResult.rowsAffected || 0;
      }
      
      // Delete contact record
      const contactResult = await db.execute(sql`
        DELETE FROM contacts WHERE id = ${contactId}
      `);
      results.tables.contacts = contactResult.rowsAffected || 0;
      
    } catch (error) {
      results.errors.push(`applications: ${(error as Error).message}`);
    }
    
    // 3. Clean up audit logs (optional - depends on retention policy)
    try {
      const auditResult = await db.execute(sql`
        DELETE FROM audit_log WHERE entity_id = ${contactId} OR data::text LIKE '%${contactId}%'
      `);
      results.tables.audit_log = auditResult.rowsAffected || 0;
    } catch (error) {
      results.errors.push(`audit_log: ${(error as Error).message}`);
    }
    
    console.log(`[RTBF] Contact ${contactId} purge completed:`, results);
    return results;
    
  } catch (error) {
    console.error(`[RTBF] Contact purge failed for ${contactId}:`, error);
    throw error;
  }
}

/**
 * Purge data for a specific application (RTBF compliance)
 */
export async function purgeApplicationData(applicationId: string) {
  console.log(`[RTBF] Starting data purge for application ${applicationId}`);
  
  const results: any = { tables: {}, anonymized: {}, errors: [] };
  
  try {
    // 1. Delete related documents
    try {
      const docsResult = await db.execute(sql`
        DELETE FROM documents WHERE application_id = ${applicationId}
      `);
      results.tables.documents = docsResult.rowsAffected || 0;
    } catch (error) {
      results.errors.push(`documents: ${(error as Error).message}`);
    }
    
    // 2. Delete communications
    try {
      const commResult = await db.execute(sql`
        DELETE FROM comm_messages WHERE application_id = ${applicationId}
      `);
      results.tables.comm_messages = commResult.rowsAffected || 0;
    } catch (error) {
      results.errors.push(`comm_messages: ${(error as Error).message}`);
    }
    
    // 3. Delete lender activity
    try {
      const lenderResult = await db.execute(sql`
        DELETE FROM lender_activity WHERE application_id = ${applicationId}
      `);
      results.tables.lender_activity = lenderResult.rowsAffected || 0;
    } catch (error) {
      results.errors.push(`lender_activity: ${(error as Error).message}`);
    }
    
    // 4. Delete decision traces
    try {
      const decisionResult = await db.execute(sql`
        DELETE FROM decision_traces WHERE application_id = ${applicationId}
      `);
      results.tables.decision_traces = decisionResult.rowsAffected || 0;
    } catch (error) {
      results.errors.push(`decision_traces: ${(error as Error).message}`);
    }
    
    // 5. Anonymize the application instead of deleting
    try {
      const appResult = await db.execute(sql`
        UPDATE applications SET
          first_name = 'REDACTED',
          last_name = 'REDACTED',
          email = 'redacted@example.com',
          phone = '+15555550000',
          ssn = '***-**-****',
          address = 'REDACTED',
          city = 'REDACTED',
          state = 'XX',
          zip = '00000',
          employer = 'REDACTED',
          updated_at = now()
        WHERE id = ${applicationId}
      `);
      results.anonymized.applications = appResult.rowsAffected || 0;
    } catch (error) {
      results.errors.push(`application_anonymization: ${(error as Error).message}`);
    }
    
    // 6. Clean up audit logs
    try {
      const auditResult = await db.execute(sql`
        DELETE FROM audit_log WHERE entity_id = ${applicationId} OR data::text LIKE '%${applicationId}%'
      `);
      results.tables.audit_log = auditResult.rowsAffected || 0;
    } catch (error) {
      results.errors.push(`audit_log: ${(error as Error).message}`);
    }
    
    console.log(`[RTBF] Application ${applicationId} purge completed:`, results);
    return results;
    
  } catch (error) {
    console.error(`[RTBF] Application purge failed for ${applicationId}:`, error);
    throw error;
  }
}