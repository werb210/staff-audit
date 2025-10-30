import { Router } from "express";
import multer from "multer";
import csv from "csv-parser";
import { requireAuth } from "../auth/verifyOnly.js";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";

const r = Router();
r.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage() });

// Upload Google Ads CSV for ROI tracking
r.post("/marketing/roi/upload-csv", upload.single('csvFile'), async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: "No CSV file provided" });
  }
  
  const { experimentId, source = "google_ads" } = req.body;
  if (!experimentId) {
    return res.status(400).json({ ok: false, error: "experimentId is required" });
  }
  
  try {
    const csvData: any[] = [];
    const csvString = req.file.buffer.toString('utf8');
    
    // Parse CSV manually for simple implementation
    const lines = csvString.split('\n');
    const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, ''));
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      
      headers?.forEach((header, index: any) => {
        row[header] = values[index] || '';
      });
      
      csvData.push(row);
    }
    
    // Insert cost data into ROI tracking
    let processedRows = 0;
    for (const row of csvData) {
      // Map common Google Ads CSV columns
      const clickCost = parseFloat(row.Cost || row.cost || row['Cost (USD)'] || '0');
      const clicks = parseInt(row.Clicks || row.clicks || '0');
      const impressions = parseInt(row.Impressions || row.impressions || '0');
      const campaignName = row.Campaign || row.campaign || row['Campaign name'] || 'Unknown';
      const date = row.Date || row.date || new Date().toISOString().split('T')[0];
      
      if (clickCost > 0 || clicks > 0) {
        await db.execute(sql`
          INSERT INTO roi_tracking (
            experiment_id, 
            action_type, 
            cost_dollars, 
            metadata, 
            createdAt
          ) VALUES (
            ${experimentId},
            'ad_spend',
            ${clickCost},
            ${JSON.stringify({
              source,
              campaign: campaignName,
              clicks,
              impressions,
              date,
              raw_row: row
            })}::jsonb,
            NOW()
          )
        `);
        processedRows++;
      }
    }
    
    res.json({ 
      ok: true, 
      message: `Processed ${processedRows} cost entries from CSV`,
      totalRows: csvData.length,
      processedRows 
    });
    
  } catch (error: unknown) {
    console.error('CSV processing error:', error);
    res.status(500).json({ 
      ok: false, 
      error: "Failed to process CSV file",
      details: String(error)
    });
  }
});

// Get CSV upload template
r.get("/marketing/roi/csv-template", (req: any, res: any) => {
  const template = `Campaign,Date,Clicks,Impressions,Cost
"Brand Campaign","2025-08-18",125,5420,45.60
"Search Campaign","2025-08-18",89,3210,32.40
"Display Campaign","2025-08-18",67,8900,28.90`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="google-ads-template.csv"');
  res.send(template);
});

// Bulk cost import status
r.get("/marketing/roi/import-history", async (req: any, res) => {
  try {
    const { rows } = await db.execute(sql`
      SELECT 
        experiment_id,
        COUNT(*) as import_count,
        SUM(cost_dollars) as total_cost,
        MIN(createdAt) as first_import,
        MAX(createdAt) as last_import
      FROM roi_tracking 
      WHERE action_type = 'ad_spend'
        AND metadata->>'source' IS NOT NULL
      GROUP BY experiment_id
      ORDER BY last_import DESC
    `);
    
    res.json({ ok: true, imports: rows });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Failed to fetch import history" });
  }
});

export default r;