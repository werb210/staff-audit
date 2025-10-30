// server/jobs/schedule_lender_push.ts
import cron from "node-cron";
// Using dynamic import to avoid compilation issues with ES modules
// import { pushLendersToClients } from "../../scripts/push_lenders_to_clients.js";
const TZ = process.env.CRON_TZ || "America/New_York";
/**
 * Runs at minute 0 of hour 0 and 12 (midnight + noon) daily.
 * Cron: 0 0,12 * * *
 */
export function scheduleLenderPush() {
    const task = cron.schedule("0 0,12 * * *", async () => {
        console.log(`⏰ Cron: pushing lenders/products at ${new Date().toISOString()}`);
        try {
            const { pushLendersToClients } = await import("../../scripts/push_lenders_to_clients.js");
            await pushLendersToClients();
        }
        catch (e) {
            console.error("❌ Scheduled push failed:", e?.response?.data ?? e);
        }
    }, { timezone: TZ });
    console.log(`🗓️  Lender push scheduled at 00:00 & 12:00 (${TZ})`);
    return task;
}
