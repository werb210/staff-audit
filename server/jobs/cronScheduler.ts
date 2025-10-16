/**
 * 📅 CRON JOB SCHEDULER
 * Automated job scheduling for weekday SMS reminders and other periodic tasks
 */

import cron from 'node-cron';
import { sendMissingDocsReminders } from './missingDocsReminder.js';

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs() {
  console.log('📅 [CRON] Initializing scheduled jobs...');
  
  // Missing Documents Reminder - 10:00 AM weekdays (Mon-Fri)
  cron.schedule('0 10 * * 1-5', async () => {
    console.log('📨 [CRON] Running daily Missing Documents SMS job...');
    try {
      const result = await sendMissingDocsReminders();
      console.log('📨 [CRON] Missing docs reminder job completed:', result);
    } catch (error) {
      console.error('❌ [CRON] Missing docs reminder job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/New_York" // Adjust timezone as needed
  });
  
  console.log('✅ [CRON] Scheduled jobs initialized:');
  console.log('  - Missing Documents Reminder: 10:00 AM weekdays (Mon-Fri)');
  
  // Log cron status
  const tasks = cron.getTasks();
  console.log(`📅 [CRON] Total active tasks: ${tasks.size}`);
}

/**
 * Get status of all cron jobs
 */
export function getCronStatus() {
  const tasks = cron.getTasks();
  return {
    totalTasks: tasks.size,
    jobs: [
      {
        name: 'Missing Documents Reminder',
        schedule: '0 10 * * 1-5',
        description: '10:00 AM weekdays (Mon-Fri)',
        timezone: 'America/New_York',
        active: true
      }
    ],
    lastCheck: new Date().toISOString()
  };
}