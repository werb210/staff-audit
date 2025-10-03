// Health check endpoint for production monitoring
import { Router } from "express";
import { db } from "../db.js";
import { sql } from "drizzle-orm";

const router = Router();

// GET /api/health - Production health check
router.get("/health", async (req: any, res: any) => {
  const startTime = Date.now();
  
  try {
    // Test database connectivity
    const dbTest = await db.execute(sql`SELECT 1 as test`);
    const dbHealthy = dbTest.rows.length > 0;
    
    // Get basic system stats
    const dbStats = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM lenders WHERE is_active = true) as active_lenders,
        (SELECT COUNT(*) FROM lender_products WHERE is_active = true) as active_products,
        (SELECT COUNT(*) FROM applications) as total_applications
    `);
    
    const responseTime = Date.now() - startTime;
    
    const healthData = {
      status: "ok",
      env: "production",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: {
        status: dbHealthy ? "healthy" : "unhealthy",
        activeLenders: dbStats.rows[0]?.active_lenders || 0,
        activeProducts: dbStats.rows[0]?.active_products || 0,
        totalApplications: dbStats.rows[0]?.total_applications || 0
      },
      version: "2025.08.23.1"
    };
    
    console.log(`✅ [HEALTH] System healthy - ${responseTime}ms response time`);
    res.json(healthData);
    
  } catch (error: any) {
    console.error("❌ [HEALTH] Health check failed:", error);
    
    const responseTime = Date.now() - startTime;
    
    res.status(503).json({
      status: "unhealthy",
      env: "production", 
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : String(error) || "Health check failed",
      database: {
        status: "unhealthy"
      }
    });
  }
});

export default router;