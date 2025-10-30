import * as cron from "node-cron";
import { runDocumentStartupAudit } from "./services/documentAuditService";
export function startCronJobs() {
    console.log('🕒 [CRON] Initializing daily document maintenance jobs...');
    // Daily SHA256 and Object Storage backfill at 3:00 AM
    cron.schedule("0 3 * * *", async () => {
        console.log("🕒 [CRON] Running daily SHA256/ObjectStorage backfill...");
        try {
            const result = await runDocumentStartupAudit();
            console.log(`✅ [CRON] Daily backfill completed: ${result.totalProcessed} documents processed`);
        }
        catch (error) {
            console.error('❌ [CRON] Daily backfill failed:', error);
        }
    });
    // Weekly system health check on Sundays at 2:00 AM
    cron.schedule("0 2 * * 0", async () => {
        console.log("🕒 [CRON] Running weekly system health check...");
        try {
            const { runDocumentStartupAudit } = await import("./services/documentAuditService");
            await runDocumentStartupAudit();
            console.log('✅ [CRON] Weekly system health check completed');
        }
        catch (error) {
            console.error('❌ [CRON] Weekly health check failed:', error);
        }
    });
    console.log('✅ [CRON] Document maintenance cron jobs started successfully');
    console.log('📅 [CRON] Schedule: Daily backfill at 3:00 AM, Weekly health check on Sundays at 2:00 AM');
}
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 [CRON] Gracefully shutting down cron jobs...');
    // Note: node-cron doesn't have a global destroy method
});
process.on('SIGINT', () => {
    console.log('🔄 [CRON] Gracefully shutting down cron jobs...');
    // Note: node-cron doesn't have a global destroy method
});
