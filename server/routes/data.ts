import { Router } from "express";
import { db } from "../db/drizzle.js";

const r = Router();

type Table = "lenders" | "lender_products" | "applications" | "users" | "contacts" | "ads_campaigns";
const MAP: Record<Table, { model: keyof PrismaClientMap; defaultOrder?: string; expand?: Record<string, any> }> = {
  lenders:         { model: "lender",          defaultOrder: "name" },
  lender_products: { model: "lenderProduct",   defaultOrder: "name",        expand: { lender: true } },
  applications:    { model: "applications",     defaultOrder: "-createdAt",  expand: { businesses: true, users: true, lender: true } },
  users:           { model: "users",            defaultOrder: "email" },
  contacts:        { model: "contacts",         defaultOrder: "full_name" },
  ads_campaigns:   { model: "adsCampaign",      defaultOrder: "name" },
};

// minimal typing to index prisma dynamically
type PrismaClientMap = {
  lender: any; lenderProduct: any; applications: any; users: any; contacts: any; adsCampaign: any;
};

function parseOrder(orderStr?: string) {
  if (!orderStr) return undefined;
  const f = orderStr.trim();
  const desc = f.startsWith("-");
  const field = desc ? f.slice(1) : f;
  return { [field]: desc ? "desc" : "asc" } as any;
}

function parseFields(input?: string): any {
  if (!input || input === "*" ) return undefined; // select all
  const obj: any = {};
  for (const k of input.split(",").map(s => s.trim()).filter(Boolean)) obj[k] = true;
  return obj;
}

function parseExpand(input?: string, allowed?: Record<string, any>) {
  if (!input || !allowed) return undefined;
  const inc: any = {};
  for (const k of input.split(",").map(s => s.trim()).filter(Boolean)) {
    if (k in allowed) inc[k] = true;
  }
  return Object.keys(inc).length ? inc : undefined;
}

async function stringColumns(table: Table): Promise<string[]> {
  // For PostgreSQL, query metadata for string columns
  const tableNames = tableToDbName(table);
  const rows = await db.$queryRawUnsafe(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '${tableNames}'
      AND data_type IN ('character varying', 'text', 'varchar', 'char')
  `) as any[];
  return rows.map((r: any) => r.column_name);
}

function tableToDbName(t: Table) {
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

r.get("/schema/:table", async (req: any, res: any) => {
  try {
    const table = req.params.table as Table;
    if (!MAP[table]) return res.status(404).json({ ok: false, error: "unknown_table" });
    
    const tableName = tableToDbName(table);
    const cols = await db.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${tableName}'
      ORDER BY ordinal_position
    `) as any[];
    res.json({ ok: true, table, columns: cols });
  } catch (e) {
    console.error('Schema error:', e);
    res.status(500).json({ ok: false, error: "schema_error" });
  }
});

r.get("/:table", async (req: any, res: any) => {
  try {
    const table = req.params.table as Table;
    const cfg = MAP[table];
    if (!cfg) return res.status(404).json({ ok:false, error:"unknown_table" });

    const limit  = Math.min(Number(req.query.limit ?? 100), 1000);
    const offset = Number(req.query.offset ?? 0);
    const order  = parseOrder(String(req.query.orderBy || cfg.defaultOrder));
    const fields = parseFields(String(req.query.fields || "*"));
    const include = parseExpand(String(req.query.expand || ""), cfg.expand);
    const whereParam = req.query.where ? JSON.parse(String(req.query.where)) : undefined;

    // simple full-text "q" across string columns (contains, case-insensitive)
    const q = String(req.query.q || "").trim();
    let where: any = whereParam || {};
    if (q) {
      const cols = await stringColumns(table);
      if (cols.length) {
        where = { AND: [ whereParam || {}, { OR: cols.map(c => ({ [c]: { contains: q, mode: "insensitive" } })) } ] };
      }
    }

    const model = (prisma as any)[cfg.model];
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
  } catch (e:any) {
    console.error('Data API error:', e);
    res.status(500).json({ ok:false, error:"query_failed", detail: String(e.message || e) });
  }
});

// minimal CSV
function toCSV(rows: any[]): string {
  if (!rows.length) return "";
  const flat = rows.map((row: any) => flatten(row));
  const headers = Array.from(flat.reduce((s,r)=>{Object.keys(r).forEach(k=>s.add(k)); return s;}, new Set<string>()));
  const esc = (v:any) => {
    const s = v==null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  };
  return [headers.join(","), ...flat.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
}

function flatten(o:any, pfx=""): any {
  if (o==null || typeof o!=="object" || Array.isArray(o)) return { [pfx||"value"]: Array.isArray(o)?JSON.stringify(o):o };
  const out:any = {};
  for (const [k,v] of Object.entries(o)) {
    const key = String(k);
    if (v && typeof v === "object" && !Array.isArray(v)) Object.assign(out, flatten(v, pfx?`${pfx}.${key}`:key));
    else out[pfx?`${pfx}.${key}`:key] = Array.isArray(v)?JSON.stringify(v):v;
  }
  return out as Record<string, any>;
}

// PATCH endpoint for updating records
r.patch("/:table/:id", async (req: any, res: any) => {
  try {
    const table = req.params.table as Table;
    const id = req.params.id;
    const cfg = MAP[table];
    if (!cfg) return res.status(404).json({ ok: false, error: "unknown_table" });

    const model = (prisma as any)[cfg.model];
    const updated = await model.update({
      where: { id },
      data: req.body,
    });

    res.json({ ok: true, item: updated });
  } catch (e: any) {
    console.error('Update error:', e);
    res.status(500).json({ ok: false, error: "update_failed", detail: String(e.message || e) });
  }
});

// Database Integration Pack - Metadata Endpoint
r.get("/meta", async (req: any, res: any) => {
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
    const counts: any = {};
    for (const [modelKey, config] of Object.entries(models)) {
      if (config.tenant_aware) {
        try {
          const model = (prisma as any)[config.table.toLowerCase()] || (prisma as any)[MAP[modelKey as Table]?.model];
          if (model) {
            const [bfCount, slfCount] = await Promise.all([
              model.count({ where: { tenant: "bf" } }),
              model.count({ where: { tenant: "slf" } })
            ]);
            counts[modelKey] = { bf: bfCount, slf: slfCount, total: bfCount + slfCount };
          }
        } catch (e) {
          counts[modelKey] = { error: "count_failed" };
        }
      } else {
        try {
          const model = (prisma as any)[config.table.toLowerCase()] || (prisma as any)[MAP[modelKey as Table]?.model];
          if (model) {
            const total = await model.count();
            counts[modelKey] = { total };
          }
        } catch (e) {
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
  } catch (error: unknown) {
    console.error("Metadata endpoint error:", error);
    res.status(500).json({
      ok: false,
      error: "metadata_failed",
      detail: error instanceof Error ? error instanceof Error ? error.message : String(error) : "unknown error"
    });
  }
});

export default r;