import { db } from "../db.ts";
import { expectedRevenue } from "../lib/objective.js";
import { smsStaff } from "./lib.js";
export async function dailyBriefJob() {
    const tenant = "bf"; // run twice if you want BF+SLF
    const since = new Date();
    since.setDate(since.getDate() - 1);
    // Note: adsSpend table may not exist in current schema
    const spend = []; // Temporary stub
    const cost = spend.reduce((s, x) => s + Number(x.costMicros) / 1_000_000, 0);
    const apps = await db.applications.findMany({
        where: { createdAt: { gte: since } },
        select: { status: true, requested_amount: true }
    });
    const appData = apps.map(a => ({
        status: a.status || "new",
        amountRequested: Number(a.requested_amount || 0)
    }));
    const rev = expectedRevenue(appData);
    await smsStaff(`Daily Brief (${tenant})\nSpend: $${cost.toFixed(0)}\nExpected Rev: $${rev.toFixed(0)}\nApps: ${apps.length}`);
}
