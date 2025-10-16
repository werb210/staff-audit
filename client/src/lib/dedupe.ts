// Safe utilities to prevent duplicates and undefined errors
export function uniqBy<T extends Record<string, any>>(xs: T[], key: keyof T): T[] {
  const map = new Map<any, T>();
  for (const x of xs) if (!map.has(x[key])) map.set(x[key], x);
  return Array.from(map.values());
}

export function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value as T];
}

export function lower(x: unknown): string {
  return (x ?? '').toString().toLowerCase();
}

export function safeString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

export function safeLower(value: unknown): string {
  return safeString(value).toLowerCase();
}

// Detect duplicate requests in dev
const inFlight = new Set<string>();
export async function getJSON<T>(url: string, key = url): Promise<T> {
  if (process.env.NODE_ENV === 'development' && inFlight.has(key)) {
    console.warn('[DUP REQ]', key);
  }
  inFlight.add(key);
  try {
    const r = await fetch(url, {});
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } finally {
    inFlight.delete(key);
  }
}