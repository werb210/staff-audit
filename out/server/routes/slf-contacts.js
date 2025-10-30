import express from "express";
import fetch from "node-fetch";
const router = express.Router();
const SLF_BASE = process.env.SLF_EXT_BASE || "https://qa-fintech.buildingdigital.com";
const SLF_TOKEN = process.env.SLF_EXT_TOKEN || "Token c6b32011b346f3cf2df798ceb20757aec835d74b";
const SLF_CONTACTS_PATH = "/api/credit/request/view/all/";
function authHeaders(extra = {}) {
    return { Authorization: SLF_TOKEN, ...extra };
}
// --- email canonicalizer (gmail dot/plus + case-insens) ---
export function canonicalEmail(raw) {
    if (!raw)
        return "";
    const lower = raw.trim().toLowerCase();
    const [user, domain] = lower.split("@");
    if (!user || !domain)
        return lower;
    if (domain === "gmail.com" || domain === "googlemail.com") {
        const noDots = user.replace(/\./g, "");
        const noPlus = noDots.split("+")[0];
        return `${noPlus}@gmail.com`;
    }
    return `${user.split("+")[0]}@${domain}`;
}
// --- shallow merge preferring non-empty values ---
function prefer(a, b) {
    return (a === undefined || a === null || a === "" || a === "Name Not Set") ? b : a;
}
// Map raw SLF object -> normalized Contact
function mapRawToContact(raw) {
    // Based on actual SLF data structure: {id, sub, amount, createdAt, country, etc}
    const name = raw.sub || `Credit Request ${raw.id}`;
    const company = raw.sub || "SLF Credit Request";
    const email = `${raw.sub}@slf.example.com`; // Generate email from sub
    const id = String(raw.id ?? Math.random().toString(36).slice(2));
    return {
        id,
        email,
        emailCanonical: canonicalEmail(email),
        name,
        company,
        phone_e164: "",
        mobile_e164: "",
        title: "",
        createdAt: raw.createdAt || null,
        updatedAt: null,
        // Include SLF-specific fields
        amount: raw.amount || null,
        country: raw.country || null,
        isActive: raw.isActive || null,
        offered: raw.offered || null,
        pendingOffers: raw.pendingOffers || null,
        notes: raw.notes || null,
        hidden: raw.hidden || null,
        // keep everything else so UI can expose ALL FIELDS
        _raw: raw
    };
}
// server-side in-memory cache (optional safety)
const memory = {
    schema: null,
};
// GET schema from remote OpenAPI so UI can list ALL fields dynamically
router.get("/contacts/schema", async (req, res) => {
    try {
        const resp = await fetch(`${SLF_BASE}/api/schema/?format=openapi-json`, { headers: authHeaders() });
        if (!resp.ok)
            return res.status(resp.status).json({ ok: false, error: "schema_fetch_failed" });
        const spec = await resp.json();
        memory.schema = spec;
        res.json({ ok: true, spec });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: e.message || "schema_error" });
    }
});
// GET contacts list (deduped by email)
router.get("/contacts", async (req, res) => {
    try {
        const url = `${SLF_BASE}${SLF_CONTACTS_PATH}`;
        console.log('🔍 SLF Contacts: Fetching from', url);
        const resp = await fetch(url, { headers: authHeaders() });
        if (!resp.ok)
            return res.status(resp.status).json({ ok: false, error: "upstream_error" });
        const data = await resp.json();
        console.log('🔍 SLF Contacts: Raw data keys:', Object.keys(data || {}));
        console.log('🔍 SLF Contacts: Requests array length:', data?.requests?.length || 0);
        console.log('🔍 SLF Contacts: Full data sample:', JSON.stringify(data, null, 2).slice(0, 500));
        // The external API returns {allStates, requests, summary, total} - we want the requests array
        const rows = data?.requests || [];
        console.log('🔍 SLF Contacts: Processing', rows.length, 'raw records');
        if (rows.length > 0) {
            console.log('🔍 SLF Contacts: First record:', JSON.stringify(rows[0], null, 2));
        }
        // map + dedupe
        const byEmail = new Map();
        for (const raw of rows) {
            const c = mapRawToContact(raw);
            const key = c.emailCanonical || `noemail:${c.id}`;
            console.log('🔍 SLF Contacts: Mapped contact', c.id, 'key:', key);
            if (!byEmail.has(key)) {
                byEmail.set(key, c);
            }
            else {
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
        console.log('🔍 SLF Contacts: Final items count:', items.length);
        res.json({ ok: true, count: items.length, items });
    }
    catch (e) {
        console.error('🔍 SLF Contacts: Error:', e.message);
        res.status(500).json({ ok: false, error: e.message || "proxy_error" });
    }
});
// GET single by id (best-effort find from list) – keeps secrets server-side
router.get("/contacts/:id", async (req, res) => {
    try {
        const url = `${SLF_BASE}${SLF_CONTACTS_PATH}`;
        const resp = await fetch(url, { headers: authHeaders() });
        if (!resp.ok)
            return res.status(resp.status).json({ ok: false, error: "upstream_error" });
        const data = await resp.json();
        const rows = data.requests || [];
        const found = rows.find((raw) => String(raw.id) === req.params.id);
        if (!found)
            return res.status(404).json({ ok: false, error: "not_found" });
        const contact = mapRawToContact(found);
        res.json({ ok: true, item: contact });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: e.message || "detail_error" });
    }
});
// PATCH generic update → forwards to upstream if they support it, otherwise 200 no-op
router.patch("/contacts/:id", express.json(), async (req, res) => {
    try {
        // If upstream provides a PATCH endpoint for contacts, wire it here. Otherwise store locally / return echo.
        const upstreamPath = process.env.SLF_CONTACT_PATCH_PATH; // e.g., /api/contacts/:id/
        if (upstreamPath) {
            const u = `${SLF_BASE}${upstreamPath.replace(":id", req.params.id)}`;
            const r = await fetch(u, { method: "PATCH", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(req.body) });
            const j = await r.json().catch(() => ({}));
            return res.status(r.status).json(j);
        }
        res.json({ ok: true, note: "no_upstream_patch_configured", accepted: req.body });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: e.message || "patch_error" });
    }
});
// GET comprehensive data from ALL SLF endpoints for field discovery
router.get("/contacts/all-fields", async (req, res) => {
    try {
        console.log('🔍 SLF All Fields: Starting comprehensive data fetch');
        const endpoints = [
            { name: 'credit_requests', path: '/api/credit/request/view/all/', dataKey: 'requests' },
            { name: 'credit_bids_completed', path: '/api/credit/bid/view/completed/', dataKey: null },
            { name: 'credit_bids_pending', path: '/api/credit/bid/view/pending/', dataKey: null },
            { name: 'equipment_requests', path: '/api/equipment-financing/request/view/all/', dataKey: null },
            { name: 'factoring_bids_pending', path: '/api/factoring/bid/view/pending/', dataKey: null },
            { name: 'invoices', path: '/api/invoice/view/all/', dataKey: null },
            { name: 'partnerships', path: '/api/partnership/view/all/', dataKey: null },
            { name: 'change_orders', path: '/api/change-order/view/all/', dataKey: null }
        ];
        const allFieldData = {};
        const sampleData = {};
        for (const endpoint of endpoints) {
            try {
                const url = `${SLF_BASE}${endpoint.path}`;
                console.log(`🔍 Fetching ${endpoint.name} from ${url}`);
                const resp = await fetch(url, { headers: authHeaders() });
                if (!resp.ok) {
                    console.log(`⚠️  ${endpoint.name}: HTTP ${resp.status}`);
                    continue;
                }
                const data = await resp.json();
                const items = endpoint.dataKey ? data[endpoint.dataKey] : (Array.isArray(data) ? data : [data]);
                if (items && items.length > 0) {
                    const sample = items[0];
                    allFieldData[endpoint.name] = {
                        count: items.length,
                        fields: Object.keys(sample),
                        sample_values: Object.keys(sample).reduce((acc, key) => {
                            acc[key] = typeof sample[key];
                            return acc;
                        }, {})
                    };
                    sampleData[endpoint.name] = sample;
                    console.log(`✅ ${endpoint.name}: ${items.length} items, ${Object.keys(sample).length} fields`);
                }
                else {
                    console.log(`⚠️  ${endpoint.name}: No data`);
                    allFieldData[endpoint.name] = { count: 0, fields: [], sample_values: {} };
                }
            }
            catch (e) {
                console.error(`❌ ${endpoint.name}:`, e.message);
                allFieldData[endpoint.name] = { error: e.message };
            }
        }
        res.json({
            ok: true,
            summary: allFieldData,
            samples: sampleData,
            total_unique_fields: [...new Set(Object.values(allFieldData).flatMap((d) => d.fields || []))].length
        });
    }
    catch (e) {
        console.error('🔍 SLF All Fields: Error:', e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});
export default router;
