// Same-origin API calls only: works in preview, prod, and localhost.
const normalize = (path) => path.startsWith("/api/") ? path : `/api/${path.replace(/^\/+/, "")}`;
export async function apiGet(path, init = {}) {
    const url = normalize(path);
    const res = await fetch(url, {
        headers: { Accept: "application/json", ...(init.headers || {}) },
        ...init,
    });
    if (!res.ok)
        throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
    if (init.asText)
        return (await res.text());
    return (await res.json());
}
export async function apiPost(path, body, init = {}) {
    const url = normalize(path);
    const res = await fetch(url, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(init.headers || {}),
        },
        body: JSON.stringify(body),
        ...init,
    });
    if (!res.ok)
        throw new Error(`POST ${url} → ${res.status} ${res.statusText}`);
    return (await res.json());
}
