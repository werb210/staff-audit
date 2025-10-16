import { Router } from "express";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";

const r = Router();

function getTenantFromRequest(req: any): string {
  return req.headers["x-tenant"] || req.query.tenant || "bf";
}

function cleanPhone(p: string) {
  const d = p.replace(/[^\d]/g,"");
  if (!d) return undefined;
  return d.length === 10 ? `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}` : d;
}

function mapCompanyToDisplay(company: string) {
  const c = company.trim();
  const table: Record<string,string> = {
    "accord financial inc.":"Accord Financial",
    "accord financial":"Accord Financial", 
    "capital direct":"Capital Direct",
    "quick funding corp":"Quick Funding Corp",
  };
  const key = c.toLowerCase();
  return table[key] || c.replace(/\s+inc\.?$/i,"");
}

function normalizeLender(x: any) {
  const rawName = (x.company_name || "").trim();
  const display = mapCompanyToDisplay(rawName);
  const phone = x.phone ? cleanPhone(x.phone) : undefined;
  return {
    id: x.id,
    company_name: rawName || display,
    display_name: display,
    email: x.email?.trim(),
    phone,
    status: x.is_active ? "active" : "inactive",
    notes: x.description || "",
    tenant: x.tenant
  };
}

/** -------- Lenders -------- */
r.get("/", async (req: any, res: any) => {
  try {
    const tenant = getTenantFromRequest(req);
    const results = await db.execute(sql`
      SELECT * FROM lenders 
      WHERE tenant = ${tenant} OR tenant IS NULL
      ORDER BY company_name
    `);
    const items = results.rows.map(normalizeLender);
    res.json({ ok: true, items });
  } catch (error: unknown) {
    console.error("Error fetching lenders:", error);
    res.status(500).json({ ok: false, error: "database_error" });
  }
});

r.get("/:id", async (req: any, res: any) => {
  try {
    const tenant = getTenantFromRequest(req);
    const results = await db.execute(sql`
      SELECT * FROM lenders 
      WHERE id = ${req.params.id} 
      AND (tenant = ${tenant} OR tenant IS NULL)
    `);
    
    if (!results.rows.length) {
      return res.status(404).json({ ok: false, error: "not_found" });
    }
    
    res.json({ ok: true, item: normalizeLender(results.rows[0]) });
  } catch (error: unknown) {
    console.error("Error fetching lender:", error);
    res.status(500).json({ ok: false, error: "database_error" });
  }
});

/** -------- Products -------- */
r.get("/:id/products", async (req: any, res: any) => {
  try {
    const tenant = getTenantFromRequest(req);
    const results = await db.execute(sql`
      SELECT * FROM lender_products 
      WHERE lender_id = ${req.params.id}
      ORDER BY name
    `);
    const items = results.rows.map(p => ({
      id: p.id,
      lender_id: p.lender_id,
      name: p.name || "",
      min_amount: p.amount_min || undefined,
      max_amount: p.amount_max || undefined,
      rate: p.interest_rate_min && p.interest_rate_max ? 
        `${p.interest_rate_min}% - ${p.interest_rate_max}%` : 
        undefined,
      status: p.is_active ? "active" : "inactive",
      notes: p.description || ""
    }));
    res.json({ ok: true, items });
  } catch (error: unknown) {
    console.error("Error fetching lender products:", error);
    res.status(500).json({ ok: false, error: "database_error" });
  }
});

r.get("/products/list", async (req: any, res: any) => {
  try {
    const tenant = getTenantFromRequest(req);
    const results = await db.execute(sql`
      SELECT * FROM lender_products 
      ORDER BY name
    `);
    const items = results.rows.map(p => ({
      id: p.id,
      lender_id: p.lender_id,
      name: p.name || "",
      min_amount: p.amount_min || undefined,
      max_amount: p.amount_max || undefined,
      rate: p.interest_rate_min && p.interest_rate_max ? 
        `${p.interest_rate_min}% - ${p.interest_rate_max}%` : 
        undefined,
      status: p.is_active ? "active" : "inactive",
      notes: p.description || ""
    }));
    res.json({ ok: true, items });
  } catch (error: unknown) {
    console.error("Error fetching lender products:", error);
    res.status(500).json({ ok: false, error: "database_error" });
  }
});

// Public lender-products endpoint
r.get("/lender-products", async (req: any, res: any) => {
  try {
    const results = await db.execute(sql`
      SELECT * FROM lender_products 
      ORDER BY name
    `);
    const products = results.rows.map(p => ({
      id: p.id,
      lender_id: p.lender_id,
      name: p.name || "",
      min_amount: p.amount_min || undefined,
      max_amount: p.amount_max || undefined,
      rate: p.interest_rate_min && p.interest_rate_max ? 
        `${p.interest_rate_min}% - ${p.interest_rate_max}%` : 
        undefined,
      status: p.is_active ? "active" : "inactive",
      notes: p.description || ""
    }));
    res.json(products);
  } catch (error: unknown) {
    console.error("Error fetching lender products:", error);
    res.status(500).json({ error: "Failed to fetch lender products" });
  }
});

// DELETE LENDER
r.delete("/:id", async (req: any, res: any) => {
  try {
    const tenant = getTenantFromRequest(req);
    const results = await db.execute(sql`
      UPDATE lenders 
      SET is_active = false, updated_at = NOW()
      WHERE id = ${req.params.id} 
      AND (tenant = ${tenant} OR tenant IS NULL)
      RETURNING *
    `);
    
    if (!results.rows.length) {
      return res.status(404).json({ ok: false, error: "not_found" });
    }
    
    res.json({ ok: true, message: "Lender deactivated successfully" });
  } catch (error: unknown) {
    console.error("Error deleting lender:", error);
    res.status(500).json({ ok: false, error: "database_error" });
  }
});

export default r;