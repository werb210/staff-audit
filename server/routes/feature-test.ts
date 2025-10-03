import { Router } from "express";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly";

const r = Router();
r.use(requireAuth);

// Comprehensive feature validation endpoint
r.get("/validate", async (req: any, res: any) => {
  const results: any = {};
  
  try {
    // Test 1: Database connectivity and schema
    const dbTest = await db.execute(sql`SELECT 1 as test`);
    results.database = { ok: true };
  } catch (error: unknown) {
    results.database = { ok: false, error: String(error) };
  }
  
  try {
    // Test 2: Lender products table structure
    const lenderTest = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lender_products'
      ORDER BY column_name
    `);
    results.lenderProducts = { 
      ok: true, 
      columns: (lenderTest.rows || lenderTest).length 
    };
  } catch (error: unknown) {
    results.lenderProducts = { ok: false, error: String(error) };
  }
  
  try {
    // Test 3: Communications tables
    const templatesTest = await db.execute(sql`SELECT COUNT(*) as count FROM message_templates`);
    const callsTest = await db.execute(sql`SELECT COUNT(*) as count FROM call_records`);
    results.communications = {
      ok: true,
      templates: (templatesTest.rows || templatesTest)[0]?.count || 0,
      calls: (callsTest.rows || callsTest)[0]?.count || 0
    };
  } catch (error: unknown) {
    results.communications = { ok: false, error: String(error) };
  }
  
  try {
    // Test 4: Document versioning
    const docsTest = await db.execute(sql`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT group_id) as groups
      FROM documents
    `);
    const docResult = (docsTest.rows || docsTest)[0];
    results.documents = {
      ok: true,
      total: docResult?.total || 0,
      groups: docResult?.groups || 0
    };
  } catch (error: unknown) {
    results.documents = { ok: false, error: String(error) };
  }
  
  // Test 5: Authentication system
  results.auth = {
    ok: true,
    user: (req as any).user?.sub || 'unknown',
    roles: (req as any).user?.roles || []
  };
  
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    features: results,
    summary: {
      totalTests: Object.keys(results).length,
      passed: Object.values(results).filter((r: any) => r.ok).length,
      failed: Object.values(results).filter((r: any) => !r.ok).length
    }
  });
});

// Health check endpoint
r.get("/health", async (_req, res) => {
  res.json({ 
    ok: true, 
    status: "healthy",
    timestamp: new Date().toISOString(),
    features: ["zod-validation", "document-versioning", "communications-hub", "twilio-webhooks"]
  });
});

export default r;