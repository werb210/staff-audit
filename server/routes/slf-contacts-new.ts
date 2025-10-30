// server/routes/slf-contacts-new.ts
import express, { Request, Response } from "express";
import type { IncomingHttpHeaders } from "http";

const router = express.Router();

const SLF_BASE = process.env.SLF_API_BASE || "https://qa-fintech.buildingdigital.com";
const SLF_TOKEN = process.env.SLF_API_TOKEN || "Token c6b32011b346f3cf2df798ceb20757aec835d74b";
const SLF_CONTACTS_PATH = process.env.SLF_CONTACTS_PATH || "/api/credit/request/view/all/";

function authHeaders(extra: Record<string, string> = {}) {
  const h: Record<string, string> = { Authorization: SLF_TOKEN, ...extra };
  return h;
}

// --- email canonicalizer (gmail dot/plus + case-insens) ---
export function canonicalEmail(raw?: string | null) {
  if (!raw) return "";
  const lower = raw.trim().toLowerCase();
  const [user, domain] = lower.split("@");
  if (!user || !domain) return lower;
  if (domain === "gmail.com" || domain === "googlemail.com") {
      const noDots = user.replace(/\./g, "");
      const noPlus = noDots.split("+")[0];
      return `${noPlus}@gmail.com`;
  }
  return `${user.split("+")[0]}@${domain}`;
}

// --- shallow merge preferring non-empty values ---
function prefer(a: any, b: any) {
  return (a === undefined || a === null || a === "" || a === "Name Not Set") ? b : a;
}

// Map raw SLF object -> normalized Contact
function mapRawToContact(raw: any) {
  // adapt these keys to your swagger fields
  const email = raw.email || raw.contactEmail || raw.applicant_email || raw.contact_email;
  const phone = raw.phone || raw.mobile || raw.contactPhone || raw.applicant_phone;
  const name  = raw.name  || raw.contactName || `${raw.first_name ?? ""} ${raw.last_name ?? ""}`.trim();
  const company = raw.company || raw.businessName || raw.business_name || raw.company_name || raw.sub;

  const id = String(raw.id ?? raw.uuid ?? raw.pk ?? (canonicalEmail(email) || name || Math.random().toString(36).slice(2)));
  return {
    id,
    email,
    emailCanonical: canonicalEmail(email),
    name,
    company,
    phone_e164: raw.phone_e164 || phone || "",
    mobile_e164: raw.mobile_e164 || "",
    title: raw.title || raw.job_title || "",
    createdAt: raw.createdAt || raw.created || raw.createdAt || raw.inserted_at || null,
    updatedAt: raw.updatedAt || raw.updated || raw.updatedAt || null,
    // keep everything else so UI can expose ALL FIELDS
    _raw: raw
  };
}

// server-side in-memory cache (optional safety)
const memory = {
  schema: null as any,
};

// GET schema from remote OpenAPI so UI can list ALL fields dynamically
router.get("/contacts/schema", async (req: Request, res: Response) => {
  try {
    const resp = await fetch(`${SLF_BASE}/api/schema/?format=openapi-json`, { headers: authHeaders() as any });
    if (!resp.ok) return res.status(resp.status).json({ ok: false, error: "schema_fetch_failed" });
    const spec = await resp.json();
    memory.schema = spec;
    res.json({ ok: true, spec });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message || "schema_error" });
  }
});

// GET contacts list (deduped by email)
router.get("/contacts", async (req: Request, res: Response) => {
  try {
    const url = `${SLF_BASE}/api/credit/requests`;
    const resp = await fetch(url, { headers: authHeaders() as any });
    if (!resp.ok) return res.status(resp.status).json({ ok: false, error: "upstream_error" });
    const data = await resp.json();

    // Accept both array or nested .results/.items
    const rows: any[] = Array.isArray(data) ? data : (data.results || data.items || []);

    // map + dedupe by email
    const byEmail = new Map<string, any>();
    for (const raw of rows) {
      const c = mapRawToContact(raw);
      const key = c.emailCanonical || `noemail:${c.id}`;
      if (!byEmail.has(key)) {
        byEmail.set(key, c);
      } else {
        const prev = byEmail.get(key);
        // merge with preference for complete values
        byEmail.set(key, {
          ...prev,
          name: prefer(prev.name, c.name),
          company: prefer(prev.company, c.company),
          phone_e164: prefer(prev.phone_e164, c.phone_e164),
          mobile_e164: prefer(prev.mobile_e164, c.mobile_e164),
          title: prefer(prev.title, c.title),
          createdAt: prefer(prev.createdAt, c.createdAt),
          updatedAt: prefer(prev.updatedAt, c.updatedAt),
          _raw: { ...prev._raw, ...c._raw }
        });
      }
    }

    const items = [...byEmail.values()];
    res.json({ ok: true, count: items.length, items });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message || "proxy_error" });
  }
});

// GET single by id (best-effort find from list)
router.get("/contacts/:id", async (req: Request, res: Response) => {
  try {
    // Get from the main contacts endpoint
    const contactsUrl = req.baseUrl.replace(/\/contacts\/.*/, "/contacts");
    const resp = await fetch(`http://localhost:5000${contactsUrl}`);
    const all = await resp.json() as any;
    const found = (all.items || []).find((c: any) => c.id === req.params.id);
    if (!found) return res.status(404).json({ ok: false, error: "not_found" });
    res.json({ ok: true, item: found });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message || "detail_error" });
  }
});

// PATCH generic update → forwards to upstream if they support it, otherwise 200 no-op
router.patch("/contacts/:id", express.json(), async (req: Request, res: Response) => {
  try {
    // If upstream provides a PATCH endpoint for contacts, wire it here. Otherwise store locally / return echo.
    const upstreamPath = process.env.SLF_CONTACT_PATCH_PATH; // e.g., /api/contacts/:id/
    if (upstreamPath) {
      const u = `${SLF_BASE}${upstreamPath.replace(":id", req.params.id)}`;
      const r = await fetch(u, { method: "PATCH", headers: authHeaders({ "Content-Type": "application/json" }) as any, body: JSON.stringify(req.body) });
      const j = await r.json().catch(()=> ({}));
      return res.status(r.status).json(j);
    }
    res.json({ ok: true, note: "no_upstream_patch_configured", accepted: req.body });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message || "patch_error" });
  }
});

export default router;