// src/shared/api.ts
// Centralized API helper that respects the injected __API_URL__ from vite.config.ts
export const API_BASE = typeof __API_URL__ !== "undefined"
    ? __API_URL__
    : import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export async function apiFetch(path, options = {}) {
    const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
        ...options,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
    }
    return res.json();
}
