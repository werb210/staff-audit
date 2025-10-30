import { Router } from "express";
import { db } from "../db/drizzle.js";
const r = Router();
const MAP = {
    lenders: { model: "lender", defaultOrder: "name" },
    lender_products: { model: "lenderProduct", defaultOrder: "name", expand: { lender: true } },
    applications: { model: "applications", defaultOrder: "-createdAt", expand: { businesses: true, users: true, lender: true } },
    users: { model: "users", defaultOrder: "email" },
    contacts: { model: "contacts", defaultOrder: "full_name" },
    ads_campaigns: { model: "adsCampaign", defaultOrder: "name" },
};
function parseOrder(orderStr) {
    if (!orderStr)
        return undefined;
    const f = orderStr.trim();
    const desc = f.startsWith("-");
    const field = desc ? f.slice(1) : f;
    return { [field]: desc ? "desc" : "asc" };
}
function parseFields(input) {
    if (!input || input === "*")
        return undefined; // select all
    const obj = {};
    for (const k of input.split(",").map(s => s.trim()).filter(Boolean))
        obj[k] = true;
    return obj;
}
function parseExpand(input, allowed) {
    if (!input || !allowed)
        return undefined;
    const inc = {};
    for (const k of input.split(",").map(s => s.trim()).filter(Boolean)) {
        if (k in allowed)
            inc[k] = true;
    }
    return Object.keys(inc).length ? inc : undefined;
}
async function stringColumns(table) {
    // For PostgreSQL, query metadata for string columns
    const tableNames = tableToDbName(table);
    const rows = await db.$queryRawUnsafe(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${tableNames}'
      AND data_type IN ('character varying', 'text', 'varchar', 'char')
  `);
    return rows.map((r) => r.column_name);
}
function tableToDbName(t) {
    // Map to actual database table names
    switch (t) {
        case "lenders": return "Lender";
        case "lender_products": return "LenderProduct";
        case "applications": return "applications";
        case "users": return "users";
        case "contacts": return "contacts";
        case "ads_campaigns": return "AdsCampaign";
    }
}
r.get("/schema/:table", async (req, res) => {
    try {
        const table = req.params.table;
        if (!MAP[table])
            return res.status(404).json({ ok: false, error: "unknown_table" });
        const tableName = tableToDbName(table);
        const cols = await db.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${tableName}'
      ORDER BY ordinal_position
    `);
        res.json({ ok: true, table, columns: cols });
    }
    catch (e) {
        console.error('Schema error:', e);
        res.status(500).json({ ok: false, error: "schema_error" });
    }
});
r.get("/:table", async (req, res) => {
    try {
        const table = req.params.table;
        const cfg = MAP[table];
        if (!cfg)
            return res.status(404).json({ ok: false, error: "unknown_table" });
        const limit = Math.min(Number(req.query.limit ?? 100), 1000);
        const offset = Number(req.query.offset ?? 0);
        const order = parseOrder(String(req.query.orderBy || cfg.defaultOrder));
        const fields = parseFields(String(req.query.fields || "*"));
        const include = parseExpand(String(req.query.expand || ""), cfg.expand);
        const whereParam = req.query.where ? JSON.parse(String(req.query.where)) : undefined;
        // simple full-text "q" across string columns (contains, case-insensitive)
        const q = String(req.query.q || "").trim();
        let where = whereParam || {};
        if (q) {
            const cols = await stringColumns(table);
            if (cols.length) {
                where = { AND: [whereParam || {}, { OR: cols.map(c => ({ [c]: { contains: q, mode: "insensitive" } })) }] };
            }
        }
        const model = prisma[cfg.model];
        const [items, total] = await Promise.all([
            model.findMany({ where, take: limit, skip: offset, orderBy: order, select: fields, include }),
            model.count({ where }),
        ]);
        if (String(req.query.export).toLowerCase() === "csv") {
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="${table}.csv"`);
            const rows = Array.isArray(items) ? items : [items];
            return res.send(toCSV(rows));
        }
        res.json({ ok: true, total, limit, offset, items });
    }
    catch (e) {
        console.error('Data API error:', e);
        res.status(500).json({ ok: false, error: "query_failed", detail: String(e.message || e) });
    }
});
// minimal CSV
function toCSV(rows) {
    if (!rows.length)
        return "";
    const flat = rows.map((row) => flatten(row));
    const headers = Array.from(flat.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s; }, new Set()));
    const esc = (v) => {
        const s = v == null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [headers.join(","), ...flat.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
}
function flatten(o, pfx = "") {
    if (o == null || typeof o !== "object" || Array.isArray(o))
        return { [pfx || "value"]: Array.isArray(o) ? JSON.stringify(o) : o };
    const out = {};
    for (const [k, v] of Object.entries(o)) {
        const key = String(k);
        if (v && typeof v === "object" && !Array.isArray(v))
            Object.assign(out, flatten(v, pfx ? `${pfx}.${key}` : key));
        else
            out[pfx ? `${pfx}.${key}` : key] = Array.isArray(v) ? JSON.stringify(v) : v;
    }
    return out;
}
// PATCH endpoint for updating records
r.patch("/:table/:id", async (req, res) => {
    try {
        const table = req.params.table;
        const id = req.params.id;
        const cfg = MAP[table];
        if (!cfg)
            return res.status(404).json({ ok: false, error: "unknown_table" });
        const model = prisma[cfg.model];
        const updated = await model.update({
            where: { id },
            data: req.body,
        });
        res.json({ ok: true, item: updated });
    }
    catch (e) {
        console.error('Update error:', e);
        res.status(500).json({ ok: false, error: "update_failed", detail: String(e.message || e) });
    }
});
// Database Integration Pack - Metadata Endpoint
r.get("/meta", async (req, res) => {
    try {
        const models = {
            lenders: {
                table: "Lender",
                tenant_aware: true,
                relations: ["products", "applications"],
                key_fields: ["name", "status", "category"]
            },
            lender_products: {
                table: "LenderProduct",
                tenant_aware: true,
                relations: ["lender"],
                key_fields: ["name", "productType", "isActive"]
            },
            applications: {
                table: "applications",
                tenant_aware: true,
                relations: ["businesses", "users", "lender", "documents"],
                key_fields: ["business_name", "status", "stage"]
            },
            users: {
                table: "users",
                tenant_aware: true,
                relations: ["applications"],
                key_fields: ["email", "role", "is_active"]
            },
            contacts: {
                table: "contacts",
                tenant_aware: false,
                relations: ["call_participants", "call_records", "comms"],
                key_fields: ["full_name", "email", "status"]
            },
            ads_campaigns: {
                table: "AdsCampaign",
                tenant_aware: true,
                relations: [],
                key_fields: ["name", "platform", "status"]
            }
        };
        // Get table counts per tenant
        const counts = {};
        for (const [modelKey, config] of Object.entries(models)) {
            if (config.tenant_aware) {
                try {
                    const model = prisma[config.table.toLowerCase()] || prisma[MAP[modelKey]?.model];
                    if (model) {
                        const [bfCount, slfCount] = await Promise.all([
                            model.count({ where: { tenant: "bf" } }),
                            model.count({ where: { tenant: "slf" } })
                        ]);
                        counts[modelKey] = { bf: bfCount, slf: slfCount, total: bfCount + slfCount };
                    }
                }
                catch (e) {
                    counts[modelKey] = { error: "count_failed" };
                }
            }
            else {
                try {
                    const model = prisma[config.table.toLowerCase()] || prisma[MAP[modelKey]?.model];
                    if (model) {
                        const total = await model.count();
                        counts[modelKey] = { total };
                    }
                }
                catch (e) {
                    counts[modelKey] = { error: "count_failed" };
                }
            }
        }
        res.json({
            ok: true,
            database: {
                connected: true,
                models,
                counts,
                tenant_config: {
                    bf: { name: "Boreal Financial", isolation: true },
                    slf: { name: "Site Level Financial", isolation: true }
                }
            }
        });
    }
    catch (error) {
        console.error("Metadata endpoint error:", error);
        res.status(500).json({
            ok: false,
            error: "metadata_failed",
            detail: error instanceof Error ? error instanceof Error ? error.message : String(error) : "unknown error"
        });
    }
});
export default r;
