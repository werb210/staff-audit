// Same-origin API calls only: works in preview, prod, and localhost.
const normalize = (path: string) =>
  path.startsWith("/api/") ? path : `/api/${path.replace(/^\/+/, "")}`;

type FetchInit = RequestInit & { asText?: boolean };

export async function apiGet<T = unknown>(
  path: string,
  init: FetchInit = {},
): Promise<T> {
  const url = normalize(path);
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...(init.headers || {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  if (init.asText) return (await res.text()) as unknown as T;
  return (await res.json()) as T;
}

export async function apiPost<T = unknown>(
  path: string,
  body: any,
  init: FetchInit = {},
): Promise<T> {
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
  if (!res.ok) throw new Error(`POST ${url} → ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}
