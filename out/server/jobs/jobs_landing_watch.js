import { smsStaff } from "./lib.js";
import fetch from "node-fetch";
export async function landingWatchJob() {
    const urls = (process.env.WATCH_URLS || "").split(",").map(s => s.trim()).filter(Boolean);
    if (!urls.length)
        return;
    for (const url of urls) {
        const t0 = Date.now();
        try {
            const res = await fetch(url, { method: "GET", timeout: 5000 });
            const ms = Date.now() - t0;
            if (!res.ok || ms > 2000) {
                await smsStaff(`Landing watch: ${url} ${res.status} in ${ms}ms`);
            }
        }
        catch (e) {
            await smsStaff(`Landing watch: ${url} ERROR ${String(e.message || e)}`);
        }
    }
}
