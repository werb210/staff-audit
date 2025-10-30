import fetch from "node-fetch";
export async function sendGA4(events, opts) {
    const MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID;
    const API_SECRET = process.env.GA4_API_SECRET;
    if (!MEASUREMENT_ID || !API_SECRET) {
        return { ok: false, error: "ga4_env_missing" };
    }
    const body = {
        client_id: opts?.clientId || "555.0",
        user_id: opts?.userId || undefined,
        events
    };
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;
    try {
        const rsp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        return { ok: rsp.ok };
    }
    catch (error) {
        return { ok: false, error: "ga4_request_failed" };
    }
}
