export function alwaysArray<T=any>(v:any): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && Array.isArray((v as any).items)) return (v as any).items as T[];
  if (v && Array.isArray((v as any).data)) return (v as any).data as T[];
  return [];
}
export async function safeFetchJSON(url: string, init: RequestInit = {}) {
  const headers: Record<string,string> = { ...(init.headers as any || {}) };
  // allow dev staff token if present
  // @ts-ignore
  if (!headers.Authorization && !headers['x-staff-token'] && (window as any).__STAFF_API_KEY) {
    // @ts-ignore
    headers['x-staff-token'] = (window as any).__STAFF_API_KEY;
  }
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}