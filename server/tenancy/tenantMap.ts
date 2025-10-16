export type TenantId = "bf" | "slf";

const list = (k: string) =>
  (process.env[k] || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

// Allow exact host matches from env, plus subdomain heuristics
const BF_HOSTS = new Set(list("TENANT_BF_HOSTS")); // e.g. "bf.local,bf.staff.yourdomain.com"
const SLF_HOSTS = new Set(list("TENANT_SLF_HOSTS")); // e.g. "slf.local,slf.portal.yourdomain.com"

function cleanHost(h?: string): string {
  if (!h) return "";
  // Prioritize first host if comma-separated (as some proxies send)
  const first = h.split(",")[0].trim().toLowerCase();
  // Strip port
  return first.split(":")[0];
}

export function resolveTenantFromHeaders(headers: Record<string, any>): TenantId {
  // Prefer X-Forwarded-Host when behind a proxy
  const xfHost = cleanHost(headers["x-forwarded-host"] as string | undefined);
  const rawHost = cleanHost(headers["host"] as string | undefined);
  const host = xfHost || rawHost;

  // Exact matches from env lists
  if (host && BF_HOSTS.has(host)) return "bf";
  if (host && SLF_HOSTS.has(host)) return "slf";

  // Heuristics: subdomain contains identifier
  if (host.startsWith("slf.") || host.includes(".slf.")) return "slf";
  if (host.startsWith("bf.")  || host.includes(".bf."))  return "bf";

  // Local dev fallbacks
  if (host === "slf.local") return "slf";
  return "bf";
}