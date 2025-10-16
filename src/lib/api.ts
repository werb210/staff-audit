// ALWAYS call your backend on the same origin.
// No http(s)://, no replit.com, no env URL here.
// Works on localhost, *.replit.dev, and prod.
const normalize = (p: string) =>
  p.startsWith('/api/') ? p : `/api/${p.replace(/^\/+/, '')}`;

type FetchInit = RequestInit & { asText?: boolean };

export async function apiGet<T = unknown>(path: string, init: FetchInit = {}): Promise<T> {
  const res = await fetch(normalize(path), {
    credentials: 'include',
    headers: { 'Accept': 'application/json', ...(init.headers || {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${normalize(path)}`);
  if (init.asText) return (await res.text()) as unknown as T;
  return (await res.json()) as T;
}

export async function apiPost<T = unknown>(path: string, body: any, init: FetchInit = {}): Promise<T> {
  const res = await fetch(normalize(path), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...(init.headers || {}) },
    body: JSON.stringify(body),
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${normalize(path)}`);
  return (await res.json()) as T;
}