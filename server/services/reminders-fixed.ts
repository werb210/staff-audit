// Fixed reminders service without contact_id dependency
export async function scanAndQueueReminders() {
  try {
    console.log('[REMINDERS] Scanning for reminder opportunities...');
    
    // Simple query without contact_id to avoid schema issues
    const applications = await q(`
      SELECT id, applicant_name, email, stage, createdAt 
      FROM applications 
      WHERE stage IN ('requires_docs', 'in_review') 
      AND createdAt < NOW() - INTERVAL '24 hours'
      LIMIT 10
    `);
    
    console.log(`[REMINDERS] Found ${applications.length} applications needing follow-up`);
    return applications;
    
  } catch (error) {
    console.error('[REMINDERS] Scan failed:', error.message);
    return [];
  }
}
