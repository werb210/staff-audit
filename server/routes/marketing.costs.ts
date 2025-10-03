import { Router } from "express";
import { requireAuth } from "../auth/verifyOnly.js";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";
import multer from "multer";

const r = Router();
r.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage() });

// Upload Google Ads CSV for ROI cost tracking
r.post("/marketing/costs/upload", upload.single('csvFile'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "No CSV file provided" });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return res.status(400).json({ ok: false, error: "CSV must have header and data rows" });
    }

    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const costUploads = [];

    // Parse CSV data (expecting columns: experiment_id, variant, date, cost, impressions, clicks)
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length >= 6) {
        const [experiment_id, variant, date, cost, impressions, clicks] = values;
        
        costUploads.push({
          experiment_id,
          variant,
          date: new Date(date),
          cost: parseFloat(cost) || 0,
          impressions: parseInt(impressions) || 0,
          clicks: parseInt(clicks) || 0,
          uploaded_at: new Date()
        });
      }
    }

    // Insert cost data into database
    if (costUploads.length > 0) {
      // Create a table for marketing costs if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS marketing_costs (
          id SERIAL PRIMARY KEY,
          experiment_id TEXT NOT NULL,
          variant TEXT NOT NULL,
          date DATE NOT NULL,
          cost DECIMAL(10,2) DEFAULT 0,
          impressions INTEGER DEFAULT 0,
          clicks INTEGER DEFAULT 0,
          uploaded_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(experiment_id, variant, date)
        )
      `);

      // Insert costs using upsert to handle duplicates
      for (const cost of costUploads) {
        await db.execute(sql`
          INSERT INTO marketing_costs (experiment_id, variant, date, cost, impressions, clicks, uploaded_at)
          VALUES (${cost.experiment_id}, ${cost.variant}, ${cost.date}, ${cost.cost}, ${cost.impressions}, ${cost.clicks}, ${cost.uploaded_at})
          ON CONFLICT (experiment_id, variant, date) 
          DO UPDATE SET 
            cost = EXCLUDED.cost,
            impressions = EXCLUDED.impressions,
            clicks = EXCLUDED.clicks,
            uploaded_at = EXCLUDED.uploaded_at
        `);
      }
    }

    res.json({ 
      ok: true, 
      message: `Successfully uploaded ${costUploads.length} cost records`,
      uploaded: costUploads.length
    });

  } catch (error: unknown) {
    console.error("Cost upload error:", error);
    res.status(500).json({ ok: false, error: "Cost upload failed", details: String(error) });
  }
});

// Get cost summary for ROI calculations
r.get("/marketing/costs/summary", async (req: any, res: any) => {
  try {
    const { experiment_id, variant, days = 30 } = req.query;

    let query = sql`
      SELECT 
        experiment_id,
        variant,
        SUM(cost) as total_cost,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        COUNT(*) as days_tracked,
        MIN(date) as start_date,
        MAX(date) as end_date
      FROM marketing_costs 
      WHERE date >= NOW() - INTERVAL '${days} days'
    `;

    const conditions = [];
    if (experiment_id) conditions.push(sql`experiment_id = ${experiment_id}`);
    if (variant) conditions.push(sql`variant = ${variant}`);

    if (conditions.length > 0) {
      query = sql`${query} AND ${sql.join(conditions, sql` AND `)}`;
    }

    query = sql`${query} GROUP BY experiment_id, variant ORDER BY total_cost DESC`;

    const costs = await db.execute(query);

    res.json({ ok: true, costs });

  } catch (error: unknown) {
    console.error("Cost summary error:", error);
    res.status(500).json({ ok: false, error: "Failed to get cost summary", details: String(error) });
  }
});

// Get enhanced ROI data combining costs and revenue
r.get("/marketing/roi/enhanced", async (req: any, res: any) => {
  try {
    const { experiment_id, days = 30 } = req.query;

    let costQuery = sql`
      SELECT 
        c.experiment_id,
        c.variant,
        SUM(c.cost) as total_cost,
        SUM(c.clicks) as total_clicks
      FROM marketing_costs c 
      WHERE c.date >= NOW() - INTERVAL '${days} days'
    `;

    let revenueQuery = sql`
      SELECT 
        r.experiment_id,
        r.variant,
        COUNT(*) as conversions,
        SUM(r.revenue) as total_revenue
      FROM roi_tracking r 
      WHERE r.created_at >= NOW() - INTERVAL '${days} days'
    `;

    if (experiment_id) {
      costQuery = sql`${costQuery} AND c.experiment_id = ${experiment_id}`;
      revenueQuery = sql`${revenueQuery} AND r.experiment_id = ${experiment_id}`;
    }

    costQuery = sql`${costQuery} GROUP BY c.experiment_id, c.variant`;
    revenueQuery = sql`${revenueQuery} GROUP BY r.experiment_id, r.variant`;

    const [costs, revenues] = await Promise.all([
      db.execute(costQuery),
      db.execute(revenueQuery)
    ]);

    // Combine cost and revenue data
    const roiData = costs.map((cost: any) => {
      const revenue = revenues.find((r: any) => 
        r.experiment_id === cost.experiment_id && r.variant === cost.variant
      );

      const totalCost = parseFloat(cost.total_cost) || 0;
      const totalRevenue = parseFloat(revenue?.total_revenue) || 0;
      const conversions = parseInt(revenue?.conversions) || 0;
      const clicks = parseInt(cost.total_clicks) || 0;

      const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost * 100) : 0;
      const cpc = clicks > 0 ? (totalCost / clicks) : 0;
      const conversionRate = clicks > 0 ? ((conversions / clicks) * 100) : 0;

      return {
        experiment_id: cost.experiment_id,
        variant: cost.variant,
        total_cost: totalCost,
        total_revenue: totalRevenue,
        conversions,
        clicks,
        roi: Math.round(roi * 100) / 100,
        cpc: Math.round(cpc * 100) / 100,
        conversion_rate: Math.round(conversionRate * 100) / 100
      };
    });

    res.json({ ok: true, roi_data: roiData });

  } catch (error: unknown) {
    console.error("Enhanced ROI error:", error);
    res.status(500).json({ ok: false, error: "Failed to get enhanced ROI data", details: String(error) });
  }
});

export default r;