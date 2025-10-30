export async function smsStaff(msg, fallbackOnly = false) {
    const recips = (process.env.ALERTS_SMS_TO || "").split(",").map(s => s.trim()).filter(Boolean);
    console.log(`[SMS Staff] ${msg} (would send to: ${recips.join(", ")})`);
    // TODO: Implement actual SMS sending when Twilio SMS is configured
}
export function pctDelta(a, b) {
    if (a === 0 && b === 0)
        return 0;
    if (a === 0)
        return 100;
    return ((b - a) / a) * 100;
}
export async function lastNDaysAds(tenant, days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    // Note: adsSpend table may not exist in current schema
    return []; // Temporary stub
}
export async function lastActivityAt(opts) {
    // Note: activity table may not exist in current schema
    // const row = await db.activity?.findFirst({
    //   where: { 
    //     ...(opts.contactId ? { contactId: opts.contactId } : {}), 
    //     ...(opts.applicationId ? { applicationId: opts.applicationId } : {}) 
    //   },
    //   orderBy: { createdAt: "desc" }
    // });
    const row = null; // Temporary stub
    return row?.createdAt || null;
}
