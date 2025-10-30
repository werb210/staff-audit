import { queues, makeWorker } from "../infra/queue";
export async function startWorkers() {
    // OCR processing worker
    makeWorker(queues.ocr.name, async (job) => {
        console.log(`[OCR] Processing job: ${job.name}`);
        if (job.name === "poll-textract") {
            const { pollTextract } = await import("../services/ocr/textract");
            const { jobId, documentId } = job.data;
            await pollTextract(jobId, documentId);
        }
    });
    // SLA monitoring worker
    makeWorker(queues.sla.name, async (job) => {
        console.log(`[SLA] Processing job: ${job.name}`);
        if (job.name === "sla-tick") {
            const { evaluateSLAs } = await import("../services/slaV2");
            await evaluateSLAs();
        }
    });
    // Automation scanning worker
    makeWorker(queues.automationsScan.name, async (job) => {
        console.log(`[AUTO:SCAN] Processing job: ${job.name}`);
        if (job.name === "scan-reminders") {
            // Placeholder for reminder scanning logic
            console.log("Scanning for reminder candidates...");
        }
    });
    // Automation sending worker
    makeWorker(queues.automationsSend.name, async (job) => {
        console.log(`[AUTO:SEND] Processing job: ${job.name}`);
        if (job.name === "send-reminders") {
            // Placeholder for reminder sending logic
            console.log("Sending due reminders...");
        }
    });
    // Analytics reporting worker
    makeWorker(queues.analytics.name, async (job) => {
        console.log(`[ANALYTICS] Processing job: ${job.name}`);
        if (job.name === "monthly-export") {
            const { runAnalyticsReportOnce } = await import("../jobs/analyticsReportJob");
            await runAnalyticsReportOnce();
        }
    });
}
export async function startRepeatables() {
    // Schedule recurring jobs
    await queues.ocr.add("poll-textract-scheduler", {}, { repeat: { cron: "*/2 * * * *" } } // Every 2 minutes
    );
    await queues.sla.add("sla-tick", {}, { repeat: { cron: "*/5 * * * *" } } // Every 5 minutes
    );
    await queues.automationsScan.add("scan-reminders", {}, { repeat: { cron: "0 * * * *" } } // Every hour
    );
    await queues.automationsSend.add("send-reminders", {}, { repeat: { cron: "*/5 * * * *" } } // Every 5 minutes
    );
    await queues.analytics.add("monthly-export", {}, {
        repeat: {
            cron: process.env.ANALYTICS_PDF_CRON || "0 7 1 * *",
            tz: process.env.TIMEZONE || "America/Edmonton"
        }
    });
    console.log("✅ [QUEUES] Repeatable jobs scheduled");
}
export { queues };
