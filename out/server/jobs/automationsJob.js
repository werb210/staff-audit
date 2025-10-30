import cron from "node-cron";
import { scanAndQueueReminders, sendDueReminders } from "../services/reminders";
export function startAutomationsJob() {
    // scan every hour
    cron.schedule("0 * * * *", async () => {
        try {
            await scanAndQueueReminders();
        }
        catch (e) {
            console.error("[Automations] scan failed", e);
        }
    }, { timezone: process.env.TIMEZONE || "America/Edmonton" });
    // send every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
        try {
            await sendDueReminders();
        }
        catch (e) {
            console.error("[Automations] send failed", e);
        }
    }, { timezone: process.env.TIMEZONE || "America/Edmonton" });
}
