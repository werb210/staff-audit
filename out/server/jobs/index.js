import cron from "node-cron";
import { dailyBriefJob } from "./jobs_daily_brief.js";
import { slaWatchJob } from "./jobs_sla_watch.js";
import { docsChecklistJob } from "./jobs_docs_check.js";
import { adsAnomalyJob } from "./jobs_ads_anomaly.js";
import { landingWatchJob } from "./jobs_landing_watch.js";
import { scheduleLenderPush } from "./schedule_lender_push.js";
export function bootJobs() {
    // 08:30 local — daily brief
    cron.schedule("30 8 * * *", dailyBriefJob, {
        timezone: process.env.CRON_TZ || "America/Edmonton"
    });
    // Hourly — SLA watch (light)
    cron.schedule("5 * * * *", slaWatchJob, {
        timezone: process.env.CRON_TZ || "America/Edmonton"
    });
    // 09:15 local — doc checklist nag to owners (internal)
    cron.schedule("15 9 * * *", docsChecklistJob, {
        timezone: process.env.CRON_TZ || "America/Edmonton"
    });
    // Every 30 minutes — ads anomaly
    cron.schedule("*/30 * * * *", adsAnomalyJob, {
        timezone: process.env.CRON_TZ || "America/Edmonton"
    });
    // Every 10 minutes — landing page watchdog
    cron.schedule("*/10 * * * *", landingWatchJob, {
        timezone: process.env.CRON_TZ || "America/Edmonton"
    });
    // Initialize lender push scheduler (midnight & noon daily)
    scheduleLenderPush();
    console.log("[jobs] scheduled: daily brief, SLA watch, docs check, ads anomaly, landing watch, lender push");
}
