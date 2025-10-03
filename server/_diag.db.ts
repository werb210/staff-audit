import type { Express, Request, Response } from "express";

/**
 * Database diagnostics with auth context checking.
 * Shows user context, DB counts, and sample data with/without auth.
 */
export function attachDbDiag(app: Express, deps?: {getProducts?: Function, getLenders?: Function}) {
  if (process.env.API_DIAG !== "1") return;
  
  app.get("/api/_int/db-sanity", async (req: Request, res: Response) => {
    try {
      const info: any = {
        user: (req as any).user || null,
        sharedTokenAuth: (req as any).sharedTokenAuth || false,
        authHeader: req.headers.authorization ? "Bearer ***" : null,
        time: new Date().toISOString(),
        products: null,
        lenders: null,
        database_tests: {}
      };
      
      // Test direct database access
      try {
        const { db } = await import("../db.js");
        const { sql } = await import("drizzle-orm");
        
        // Count products
        const productCount = await db.execute(sql`SELECT COUNT(*) as count FROM lender_products`);
        info.database_tests.product_count = productCount.rows[0]?.count || 0;
        
        // Count lenders  
        const lenderCount = await db.execute(sql`SELECT COUNT(*) as count FROM lenders`);
        info.database_tests.lender_count = lenderCount.rows[0]?.count || 0;
        
        // Sample products
        const sampleProducts = await db.execute(sql`SELECT id, "productName", "lenderName", "isActive" FROM lender_products LIMIT 3`);
        info.database_tests.sample_products = sampleProducts.rows;
        
        // Sample lenders
        const sampleLenders = await db.execute(sql`SELECT id, name, "productCount" FROM lenders LIMIT 3`);
        info.database_tests.sample_lenders = sampleLenders.rows;
        
      } catch (dbError: any) {
        info.database_tests.error = dbError.message;
      }
      
      // Test API endpoints (simulate internal calls)
      try {
        // Test products endpoint
        const productsResponse = await fetch(`http://localhost:5000/api/v1/products`, {
          headers: req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}
        });
        info.api_tests = {
          products_status: productsResponse.status,
          products_accessible: productsResponse.ok
        };
        
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          info.api_tests.products_count = Array.isArray(productsData) ? productsData.length : 0;
          info.api_tests.products_sample = Array.isArray(productsData) ? productsData.slice(0, 2) : null;
        }
        
        // Test lenders endpoint
        const lendersResponse = await fetch(`http://localhost:5000/api/lenders`, {
          headers: req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}
        });
        info.api_tests.lenders_status = lendersResponse.status;
        info.api_tests.lenders_accessible = lendersResponse.ok;
        
        if (lendersResponse.ok) {
          const lendersData = await lendersResponse.json();
          info.api_tests.lenders_count = Array.isArray(lendersData) ? lendersData.length : 0;
          info.api_tests.lenders_sample = Array.isArray(lendersData) ? lendersData.slice(0, 2) : null;
        }
        
      } catch (apiError: any) {
        info.api_tests = { error: apiError.message };
      }
      
      res.json(info);
    } catch (e: any) {
      res.status(500).json({error: e?.message || String(e)});
    }
  });
}