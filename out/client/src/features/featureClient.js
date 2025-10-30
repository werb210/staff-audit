const API = "/api/features";
export async function reportFeatureMount(featureId) {
    try {
        await fetch(`${API}/events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Trace-Id": crypto.randomUUID?.() ?? String(Date.now()),
            },
            body: JSON.stringify({
                featureId,
                kind: "panel-mounted",
                at: Date.now(),
            }),
        });
    }
    catch (err) {
        console.warn(`[Feature Registry] Failed to report mount for ${featureId}:`, err);
    }
}
export async function reportActionAvailable(featureId) {
    try {
        await fetch(`${API}/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                featureId,
                kind: "action-available",
                at: Date.now(),
            }),
        });
    }
    catch (err) {
        console.warn(`[Feature Registry] Failed to report action for ${featureId}:`, err);
    }
}
export async function setFeatureOption(featureId, key, value) {
    try {
        const response = await fetch(`${API}/config`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ featureId, key, value }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`HTTP ${response.status}: ${error}`);
        }
        return await response.json();
    }
    catch (err) {
        console.error(`[Feature Registry] Failed to set option ${key} for ${featureId}:`, err);
        throw err;
    }
}
