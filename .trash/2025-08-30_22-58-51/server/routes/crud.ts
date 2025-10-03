import { Router } from "express";
import { db } from "../db";
import { lenders, lenderProducts, applications, users } from "../../shared/schema";
import { eq, and, desc, asc, count } from "drizzle-orm";
import { detectTenant, scopeByTenant, enforceTenantMutation, getTenantFilter, validateTenantAccess, TenantRequest } from "../middleware/tenant";

const r = Router();

// Apply tenant detection to all routes
r.use(detectTenant);

// Database Integration Pack - Comprehensive CRUD Routes

// LENDERS CRUD
r.get("/lenders", scopeByTenant, async (req: TenantRequest, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100), 1000);
    const offset = Number(req.query.offset ?? 0);
    
    // Lenders are global across tenants - no tenant filtering
    const items = await db.select().from(lenders)
      .orderBy(asc(lenders.name))
      .limit(limit)
      .offset(offset);
      
    const totalResult = await db.select({ count: count() }).from(lenders);
    const total = totalResult[0]?.count || 0;
    
    res.json({ ok: true, total, limit, offset, items });
  } catch (error) {
    console.error("Lenders GET error:", error);
    res.status(500).json({ ok: false, error: "query_failed" });
  }
});

r.post("/lenders", enforceTenantMutation, async (req: TenantRequest, res) => {
  try {
    const lender = await db.insert(lenders)
      .values(req.body)
      .returning();
    res.json({ ok: true, item: lender });
  } catch (error) {
    console.error("Lender CREATE error:", error);
    res.status(500).json({ ok: false, error: "create_failed" });
  }
});

r.patch("/lenders/:id", validateTenantAccess, async (req: TenantRequest, res) => {
  try {
    const lender = await db.update(lenders)
      .set(req.body)
      .where(eq(lenders.id, req.params.id))
      .returning();
    res.json({ ok: true, item: lender });
  } catch (error) {
    console.error("Lender UPDATE error:", error);
    res.status(500).json({ ok: false, error: "update_failed" });
  }
});

r.delete("/lenders/:id", validateTenantAccess, async (req: TenantRequest, res) => {
  try {
    await db.delete(lenders)
      .where(eq(lenders.id, req.params.id));
    res.json({ ok: true });
  } catch (error) {
    console.error("Lender DELETE error:", error);
    res.status(500).json({ ok: false, error: "delete_failed" });
  }
});

// REMOVED: Conflicting lender-products CRUD routes moved to canonical lenders-api.ts

// ADS CAMPAIGNS - Placeholder (table doesn't exist yet)
r.get("/ads-campaigns", scopeByTenant, async (req: TenantRequest, res) => {
  res.json({ ok: true, total: 0, limit: 100, offset: 0, items: [], message: "Ads campaigns table not implemented yet" });
});

r.post("/ads-campaigns", enforceTenantMutation, async (req: TenantRequest, res) => {
  res.status(501).json({ ok: false, error: "not_implemented", message: "Ads campaigns table not implemented yet" });
});

r.patch("/ads-campaigns/:id", validateTenantAccess, async (req: TenantRequest, res) => {
  res.status(501).json({ ok: false, error: "not_implemented", message: "Ads campaigns table not implemented yet" });
});

r.delete("/ads-campaigns/:id", validateTenantAccess, async (req: TenantRequest, res) => {
  res.status(501).json({ ok: false, error: "not_implemented", message: "Ads campaigns table not implemented yet" });
});

// APPLICATIONS READ (uses existing table structure)
r.get("/applications", scopeByTenant, async (req: TenantRequest, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100), 1000);
    const offset = Number(req.query.offset ?? 0);
    const whereClause = eq(applications.tenantId, req.tenant);
    
    const items = await db.select().from(applications)
      .where(whereClause)
      .orderBy(desc(applications.createdAt))
      .limit(limit)
      .offset(offset);
      
    const totalResult = await db.select({ count: count() }).from(applications)
      .where(whereClause);
    const total = totalResult[0]?.count || 0;
    
    res.json({ ok: true, total, limit, offset, items });
  } catch (error) {
    console.error("Applications GET error:", error);
    res.status(500).json({ ok: false, error: "query_failed" });
  }
});

// USERS READ (uses existing table structure)  
r.get("/users", scopeByTenant, async (req: TenantRequest, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100), 1000);
    const offset = Number(req.query.offset ?? 0);
    const whereClause = eq(users.tenantId, req.tenant);
    
    const items = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt
    }).from(users)
      .where(whereClause)
      .orderBy(asc(users.email))
      .limit(limit)
      .offset(offset);
      
    const totalResult = await db.select({ count: count() }).from(users)
      .where(whereClause);
    const total = totalResult[0]?.count || 0;
    
    res.json({ ok: true, total, limit, offset, items });
  } catch (error) {
    console.error("Users GET error:", error);
    res.status(500).json({ ok: false, error: "query_failed" });
  }
});

export default r;