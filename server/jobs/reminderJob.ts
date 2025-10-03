import cron from "node-cron";
import { processReminders } from "../services/automatedReminders";

export function startReminderJob() {
  // Process reminders every 15 minutes during business hours
  cron.schedule("*/15 * * * *", async () => {
    try { 
      await processReminders(); 
    } catch (e) { 
      console.error("[REMINDERS] Processing failed", e); 
    }
  });
  console.log("✅ Automated reminders job started (every 15 minutes)");
}