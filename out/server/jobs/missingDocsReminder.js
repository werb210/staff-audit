/**
 * 📨 MISSING DOCUMENTS REMINDER CRON JOB
 * Automated weekday SMS reminders for applications missing required documents
 * Runs at 10:00 AM Monday-Friday to remind applicants to upload documents
 */
export async function sendMissingDocsReminders() {
    console.log('📨 [MISSING-DOCS-REMINDER] Starting daily missing documents SMS job...');
    try {
        // Use the existing working enhanced SMS system directly
        const { sendEnhancedSMS } = await import('../routes/enhancedSmsTemplates.js');
        // Get database connection
        const { db } = await import('../db.js');
        const { sql } = await import('drizzle-orm');
        // Get applications that need document reminders - include all relevant stages
        const applicationsQuery = await db.execute(sql `
      SELECT id, stage, status, createdAt
      FROM applications 
      WHERE stage IN ('Requires Docs', 'New', 'In Review')
        AND createdAt >= NOW() - INTERVAL '30 days'
      ORDER BY createdAt DESC
      LIMIT 50
    `);
        const applications = applicationsQuery.rows || applicationsQuery;
        console.log(`📨 [MISSING-DOCS-REMINDER] Found ${applications.length} applications to check`);
        if (applications.length === 0) {
            console.log('📨 [MISSING-DOCS-REMINDER] No applications need reminders today');
            return {
                success: true,
                totalApplications: 0,
                remindersSent: 0,
                message: 'No applications need document reminders',
                timestamp: new Date().toISOString()
            };
        }
        const remindersNeeded = [];
        // Check each application for missing documents
        for (const app of applications) {
            try {
                const docQuery = await db.execute(sql `
          SELECT COUNT(*) as count 
          FROM documents 
          WHERE applicationId = ${app.id} 
            AND status = 'accepted'
        `);
                const docCount = parseInt((docQuery.rows?.[0] || docQuery[0])?.count || '0');
                if (docCount < 2) {
                    remindersNeeded.push(app);
                    console.log(`📨 [MISSING-DOCS-REMINDER] App ${app.id} needs reminder (${docCount} docs)`);
                }
            }
            catch (error) {
                console.error(`❌ [MISSING-DOCS-REMINDER] Error checking ${app.id}:`, error);
            }
        }
        console.log(`📨 [MISSING-DOCS-REMINDER] ${remindersNeeded.length} applications need reminders`);
        const results = [];
        // Send reminders using the working SMS system
        for (const app of remindersNeeded) {
            try {
                const smsResult = await sendEnhancedSMS(app.id, 'submission_no_docs_reminder');
                results.push({
                    applicationId: app.id,
                    success: smsResult.success,
                    error: smsResult.error || null,
                    smsId: smsResult.smsId || null
                });
                if (smsResult.success) {
                    console.log(`✅ [MISSING-DOCS-REMINDER] Sent reminder for ${app.id}`);
                }
                else {
                    console.error(`❌ [MISSING-DOCS-REMINDER] Failed for ${app.id}: ${smsResult.error}`);
                }
                // Rate limiting delay
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            catch (error) {
                console.error(`❌ [MISSING-DOCS-REMINDER] Exception for ${app.id}:`, error);
                results.push({
                    applicationId: app.id,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        const successful = results.filter(r => r.success).length;
        console.log(`✅ [MISSING-DOCS-REMINDER] Completed: ${successful}/${remindersNeeded.length} sent`);
        return {
            success: true,
            totalApplications: remindersNeeded.length,
            remindersSent: successful,
            results,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('❌ [MISSING-DOCS-REMINDER] Job failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        };
    }
}
