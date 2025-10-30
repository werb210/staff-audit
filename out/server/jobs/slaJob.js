import cron from "node-cron";
import { ensureDefaultPolicies, evaluateSlasTick } from "../services/sla";
export function startSlaJob() {
    ensureDefaultPolicies().catch(() => { });
    cron.schedule("*/5 * * * *", async () => {
        try {
            await evaluateSlasTick();
        }
        catch (e) {
            console.error("[SLA] Tick failed", e);
        }
    });
    console.log("✅ SLA monitoring job started (every 5 minutes)");
}
