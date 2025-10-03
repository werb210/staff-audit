// server/routes/deployment-health.ts - Critical deployment endpoints
import { Router } from "express";
import { Client } from "pg";

const router = Router();

// Health check - no auth required
router.get("/health", async (req: any, res: any) => {
  try {
    // Test database connection
    const client = new Client({ 
      connectionString: process.env.DATABASE_URL, 
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    await client.query("SELECT NOW()");
    await client.end();
    
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      database: "connected",
      version: "1.0.0" 
    });
  } catch (e) {
    res.status(503).json({ 
      status: "unhealthy", 
      error: String(e),
      timestamp: new Date().toISOString() 
    });
  }
});

// System diagnostics - no auth in development
router.get("/system", async (req: any, res: any) => {
  try {
    const client = new Client({ 
      connectionString: process.env.DATABASE_URL, 
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    
    // Check applications table exists
    const tableCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'applications'
      ORDER BY ordinal_position
    `);
    
    await client.end();
    
    res.json({
      status: "ok",
      database: {
        connected: true,
        applications_table: tableCheck.rows.length > 0 ? "exists" : "missing",
        columns: tableCheck.rows
      },
      environment: {
        node_env: process.env.NODE_ENV || "development",
        database_url: !!process.env.DATABASE_URL
      }
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Bootstrap data - creates demo data if none exists
router.post("/bootstrap", async (req: any, res: any) => {
  try {
    const client = new Client({ 
      connectionString: process.env.DATABASE_URL, 
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
    
    // Check if applications table exists and create demo data
    try {
      const countResult = await client.query("SELECT COUNT(*) FROM applications");
      const count = parseInt(countResult.rows[0].count);
      
      if (count === 0) {
        // Insert demo applications
        await client.query(`
          INSERT INTO applications (id, user_id, requested_amount, status, use_of_funds, created_at)
          VALUES 
          ('demo-1', 'Demo User 1', 50000, 'draft', 'Equipment purchase', NOW()),
          ('demo-2', 'Demo User 2', 75000, 'pending', 'Working capital', NOW()),
          ('demo-3', 'Demo User 3', 100000, 'review', 'Expansion', NOW())
          ON CONFLICT (id) DO NOTHING
        `);
        
        await client.end();
        res.json({ status: "bootstrapped", applications_created: 3 });
      } else {
        await client.end();
        res.json({ status: "already_exists", applications_count: count });
      }
    } catch (e) {
      await client.end();
      res.json({ status: "table_missing", error: String(e) });
    }
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;