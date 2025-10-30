export async function fetchJson(input: RequestInfo, init?: RequestInit) {
  const res = await fetch(input, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers || {}) },
  });
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 140)}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
