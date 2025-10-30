// Safe utilities to prevent duplicates and undefined errors
export function uniqBy(xs, key) {
    const map = new Map();
    for (const x of xs)
        if (!map.has(x[key]))
            map.set(x[key], x);
    return Array.from(map.values());
}
export function asArray(value) {
    if (Array.isArray(value))
        return value;
    if (value === null || value === undefined)
        return [];
    return [value];
}
export function lower(x) {
    return (x ?? "").toString().toLowerCase();
}
export function safeString(value) {
    if (typeof value === "string")
        return value;
    if (value === null || value === undefined)
        return "";
    return String(value);
}
export function safeLower(value) {
    return safeString(value).toLowerCase();
}
// Detect duplicate requests in dev
const inFlight = new Set();
export async function getJSON(url, key = url) {
    if (process.env.NODE_ENV === "development" && inFlight.has(key)) {
        console.warn("[DUP REQ]", key);
    }
    inFlight.add(key);
    try {
        const r = await fetch(url, {});
        if (!r.ok)
            throw new Error(`HTTP ${r.status}`);
        return r.json();
    }
    finally {
        inFlight.delete(key);
    }
}
