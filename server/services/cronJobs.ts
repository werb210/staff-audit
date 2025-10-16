import cron from 'node-cron';
import { db } from '../db';
import { scheduledNotifications, documentBackups } from '../../shared/schema';
import { lte, eq, and, sql } from 'drizzle-orm';
import { sendPushNotification } from '../routes/notifications';

// Process scheduled notifications every minute
const processScheduledNotifications = cron.schedule('* * * * *', async () => {
  try {
    // Skip if table doesn't exist yet
    const tableCheckResult = await db.execute(
      sql`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'scheduled_notifications'
      )`
    ).catch(() => ({ rows: [{ exists: false }] }));
    
    if (!tableCheckResult.rows?.[0]?.exists) {
      return; // Skip silently until table is created
    }

    console.log('⏰ [CRON] Processing scheduled notifications');
    
    // Get due notifications
    const dueNotifications = await db.select()
      .from(scheduledNotifications)
      .where(
        and(
          lte(scheduledNotifications.scheduledAt, new Date()),
          eq(scheduledNotifications.sent, false)
        )
      );

    if (dueNotifications.length === 0) {
      return;
    }

    console.log(`📱 [CRON] Found ${dueNotifications.length} due notifications`);

    let processed = 0;
    let errors = 0;

    for (const notification of dueNotifications) {
      try {
        const payload = notification.payload as any;
        
        // Skip notifications with null/empty payload
        if (!payload || typeof payload !== 'object') {
          console.warn(`⚠️ [CRON] Skipping notification ${notification.id} - invalid payload`);
          errors++;
          continue;
        }
        
        const userId = payload.userId || payload.assignedTo;
        
        if (userId) {
          const pushPayload = {
            title: `${notification.type} Reminder`,
            body: payload.message || 'You have a pending task',
            data: {
              applicationId: notification.applicationId,
              type: notification.type,
              notificationId: notification.id
            },
            actions: [
              {
                action: 'view',
                title: 'View Application'
              },
              {
                action: 'dismiss',
                title: 'Dismiss'
              }
            ]
          };

          const sent = await sendPushNotification(userId, pushPayload);
          
          if (sent) {
            // Mark as sent
            await db.update(scheduledNotifications)
              .set({ 
                sent: true, 
                sentAt: new Date() 
              })
              .where(eq(scheduledNotifications.id, notification.id));
            
            processed++;
          } else {
            errors++;
          }
        }
      } catch (error) {
        console.error('❌ [CRON] Error processing notification:', notification.id, error);
        errors++;
      }
    }

    if (processed > 0 || errors > 0) {
      console.log(`✅ [CRON] Processed ${processed} notifications, ${errors} errors`);
    }

  } catch (error) {
    console.error('❌ [CRON] Error in scheduled notifications job:', error);
  }
}, {
  scheduled: false // Don't start automatically
});

// Create monthly document backup on the first day of each month at 2 AM
const createMonthlyBackup = cron.schedule('0 2 1 * *', async () => {
  try {
    // Skip if table doesn't exist yet
    const tableCheckResult = await db.execute(
      sql`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'document_backups'
      )`
    ).catch(() => ({ rows: [{ exists: false }] }));
    
    if (!tableCheckResult.rows?.[0]?.exists) {
      return; // Skip silently until table is created
    }

    console.log('📦 [CRON] Creating monthly document backup');
    
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Check if backup already exists for last month
    const existingBackup = await db.select()
      .from(documentBackups)
      .where(eq(documentBackups.backupDate, lastMonth))
      .limit(1);

    if (existingBackup.length > 0) {
      console.log('📦 [CRON] Backup already exists for last month');
      return;
    }

    // Create backup entry
    const backup = await db.insert(documentBackups)
      .values({
        backupDate: lastMonth,
        documentsCount: 0, // Will be updated by backup process
        status: 'pending'
      })
      .returning();

    console.log('✅ [CRON] Monthly backup initiated:', backup[0].id);

    // Note: The actual backup creation is handled by the backup API endpoint
    // This just creates the database entry and schedules the backup

  } catch (error) {
    console.error('❌ [CRON] Error in monthly backup job:', error);
  }
}, {
  scheduled: false
});

// Cleanup old notifications (every Sunday at 3 AM)
const cleanupOldNotifications = cron.schedule('0 3 * * 0', async () => {
  try {
    // Skip if table doesn't exist yet
    const tableCheckResult = await db.execute(
      sql`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'scheduled_notifications'  
      )`
    ).catch(() => ({ rows: [{ exists: false }] }));
    
    if (!tableCheckResult.rows?.[0]?.exists) {
      return; // Skip silently until table is created
    }

    console.log('🧹 [CRON] Cleaning up old notifications');
    
    // Delete sent notifications older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const deleted = await db.delete(scheduledNotifications)
      .where(
        and(
          eq(scheduledNotifications.sent, true),
          lte(scheduledNotifications.sentAt, thirtyDaysAgo)
        )
      );

    console.log('✅ [CRON] Cleaned up old notifications');

  } catch (error) {
    console.error('❌ [CRON] Error in cleanup job:', error);
  }
}, {
  scheduled: false
});

// Start all cron jobs
export function startCronJobs() {
  console.log('⏰ [CRON] Starting enhanced cron jobs...');
  
  processScheduledNotifications.start();
  createMonthlyBackup.start();
  cleanupOldNotifications.start();
  
  console.log('✅ [CRON] Enhanced cron jobs started:');
  console.log('  - Scheduled notifications: Every minute');
  console.log('  - Monthly backups: 1st of month at 2 AM');
  console.log('  - Cleanup: Sundays at 3 AM');
}

// Stop all cron jobs
export function stopCronJobs() {
  console.log('⏹️ [CRON] Stopping enhanced cron jobs...');
  
  processScheduledNotifications.stop();
  createMonthlyBackup.stop();
  cleanupOldNotifications.stop();
  
  console.log('✅ [CRON] Enhanced cron jobs stopped');
}

export {
  processScheduledNotifications,
  createMonthlyBackup,
  cleanupOldNotifications
};