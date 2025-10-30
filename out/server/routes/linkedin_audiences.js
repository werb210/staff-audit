import { Router } from "express";
import { db } from "../db/drizzle.js";
import { normEmail, normPhone, sha256Lower } from "../lib/hash.js";
import { toCSV } from "../lib/csv.js";
const r = Router();
/**
 * Audience.definition_json schema (MVP)
 * {
 *   "tenant": "bf" | "slf",
 *   "logic": "AND" | "OR",
 *   "rules": [
 *     { "field":"contact.name|email|phone|company", "op":"contains|eq|in", "value": "..." | ["..."] },
 *     { "field":"application.status|lenderId|ownerId", "op":"eq|in", "value":"..."|["..."] },
 *     { "field":"utm.source|utm.campaign", "op":"eq|contains", "value":"..." }
 *   ],
 *   "exclude": [ ...same as rules... ]
 * }
 */
r.get("/", async (_req, res) => {
    const items = await db.linkedInAudience.findMany({ orderBy: { updatedAt: "desc" } });
    res.json({ ok: true, items });
});
r.post("/", async (req, res) => {
    const { name, tenant = "bf", definition } = req.body || {};
    const item = await db.linkedInAudience.create({
        data: { name, tenant, definition_json: definition || {}, status: "draft" }
    });
    res.json({ ok: true, item });
});
r.put("/:id", async (req, res) => {
    const { name, tenant, definition, status } = req.body || {};
    const item = await db.linkedInAudience.update({
        where: { id: req.params.id },
        data: {
            ...(name ? { name } : {}),
            ...(tenant ? { tenant } : {}),
            ...(definition ? { definition_json: definition } : {}),
            ...(status ? { status } : {}),
        }
    });
    res.json({ ok: true, item });
});
r.delete("/:id", async (req, res) => {
    await db.linkedInAudience.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
});
/** Preview: returns size and a sample of contacts (full fields) */
r.post("/:id/preview", async (req, res) => {
    const a = await db.linkedInAudience.findUnique({ where: { id: req.params.id } });
    if (!a)
        return res.status(404).json({ ok: false, error: "not_found" });
    const { whereContacts, whereApps } = buildWhere(a.definition_json);
    // Intersect contacts with app-derived contactIds if app filters exist
    let allowIds;
    if (whereApps) {
        const apps = await db.applications.findMany({ where: whereApps, select: { contact_id: true } });
        allowIds = apps.map(x => x.contact_id).filter(Boolean);
    }
    const where = allowIds ? { AND: [whereContacts, { id: { in: allowIds } }] } : whereContacts;
    const [items, total] = await Promise.all([
        db.contacts.findMany({ where, take: 50, orderBy: { updatedAt: "desc" } }),
        db.contacts.count({ where })
    ]);
    res.json({ ok: true, total, items });
});
/** Export identifiers: raw & hashed (emails/phones) */
r.get("/:id/export", async (req, res) => {
    const a = await db.linkedInAudience.findUnique({ where: { id: req.params.id } });
    if (!a)
        return res.status(404).json({ ok: false, error: "not_found" });
    const { whereContacts, whereApps } = buildWhere(a.definition_json);
    let allowIds;
    if (whereApps) {
        const apps = await db.applications.findMany({ where: whereApps, select: { contact_id: true } });
        allowIds = apps.map(x => x.contact_id).filter(Boolean);
    }
    const where = allowIds ? { AND: [whereContacts, { id: { in: allowIds } }] } : whereContacts;
    const contacts = await db.contacts.findMany({
        where,
        select: { id: true, email: true, phone: true, name: true, company: true }
    });
    const rows = contacts.map(c => {
        const email = normEmail(c.email || "");
        const phone = normPhone(c.phone || "");
        return {
            id: c.id,
            name: c.name,
            company: c.company,
            email: email || "",
            phone: phone || "",
            email_sha256: email ? sha256Lower(email) : "",
            phone_sha256: phone ? sha256Lower(phone) : "",
        };
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="audience_${a.name.replace(/\W+/g, '_')}.csv"`);
    res.send(toCSV(rows));
});
/** Sync stub: materialize + mark as synced (API call can be plugged later) */
r.post("/:id/sync", async (req, res) => {
    const a = await db.linkedInAudience.findUnique({ where: { id: req.params.id } });
    if (!a)
        return res.status(404).json({ ok: false, error: "not_found" });
    // compute size
    const prev = await fetchPreviewCount(a);
    const item = await db.linkedInAudience.update({
        where: { id: a.id },
        data: { status: "synced", sizeCache: prev, lastSyncAt: new Date() }
    });
    res.json({ ok: true, item, note: "Synced locally. LinkedIn upload can be enabled when Ads API audience upload is provisioned." });
});
// ---- helpers ----
function buildWhere(def) {
    const logic = (def?.logic || "AND").toUpperCase();
    const rules = def?.rules || [];
    const excludes = def?.exclude || [];
    const contactClauses = [];
    const appClauses = [];
    for (const r of rules) {
        const [entity, field] = String(r.field || "").split(".");
        if (entity === "contact") {
            contactClauses.push(toPrismaClause(field, r));
        }
        else if (entity === "application") {
            appClauses.push(toPrismaClause(field, r));
        }
        else if (entity === "utm") {
            // stored on AttributionClick.utms -> we approximate by name/company/email contains campaign/source for MVP
            contactClauses.push(toPrismaClause("name", { op: "contains", value: String(r.value || "") }));
        }
    }
    for (const r of excludes) {
        const [entity, field] = String(r.field || "").split(".");
        if (entity === "contact") {
            contactClauses.push({ NOT: toPrismaClause(field, r) });
        }
        else if (entity === "application") {
            appClauses.push({ NOT: toPrismaClause(field, r) });
        }
    }
    const whereContacts = contactClauses.length
        ? { [logic === "OR" ? "OR" : "AND"]: contactClauses }
        : {};
    const whereApps = appClauses.length
        ? { [logic === "OR" ? "OR" : "AND"]: appClauses }
        : undefined;
    return { whereContacts, whereApps };
}
function toPrismaClause(field, r) {
    const op = String(r.op || "eq").toLowerCase();
    const val = r.value;
    const text = (v) => ({ contains: String(v), mode: "insensitive" });
    const eq = (v) => ({ equals: v });
    const isin = (arr) => ({ in: arr });
    switch (field) {
        case "name": return { name: op === "contains" ? text(val) : eq(val) };
        case "email": return { email: op === "contains" ? text(val) : eq(val) };
        case "phone": return { phone: op === "contains" ? text(val) : eq(val) };
        case "company": return { company: op === "contains" ? text(val) : Array.isArray(val) ? isin(val) : eq(val) };
        case "status": return { status: Array.isArray(val) ? isin(val) : eq(val) }; // for Application.status when used in appClauses
        case "lenderId": return { lender_id: Array.isArray(val) ? isin(val) : eq(val) }; // for Application
        case "ownerId": return { owner_id: Array.isArray(val) ? isin(val) : eq(val) };
        default: return { name: text(val) };
    }
}
async function fetchPreviewCount(aud) {
    const { whereContacts, whereApps } = buildWhere(aud.definition_json || {});
    let allowIds;
    if (whereApps) {
        const apps = await db.applications.findMany({ where: whereApps, select: { contact_id: true } });
        allowIds = apps.map(x => x.contact_id).filter(Boolean);
    }
    const where = allowIds ? { AND: [whereContacts, { id: { in: allowIds } }] } : whereContacts;
    return db.contacts.count({ where });
}
export default r;
