import { Router } from "express";
import { db } from "../../db/drizzle";
import { sql } from "drizzle-orm";
import { lenders, lenderProducts, applications } from "../../../shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Add public access for testing - remove in production
const allowPublicAccess = (req: any, res: any, next: any) => {
  next();
};

// Monthly Lender Report API
router.get("/lenders/:lenderId/report", allowPublicAccess, async (req: any, res: any) => {
  try {
    const { lenderId } = req.params;
    
    // Get lender-specific performance metrics
    const stats = await db.execute(sql`
      SELECT
        l.name AS lender_name,
        COUNT(DISTINCT a.id) AS total_applications_sent,
        COUNT(CASE WHEN a.status IN ('approved', 'funded') THEN 1 END) AS approved_count,
        ROUND(
          100.0 * COUNT(CASE WHEN a.status IN ('approved', 'funded') THEN 1 END) / NULLIF(COUNT(*), 0), 
          1
        ) AS approval_rate,
        AVG(EXTRACT(EPOCH FROM (a.updatedAt - a.createdAt)) / 3600) AS avg_response_hours,
        SUM(CASE WHEN a.status = 'funded' THEN a.amount * 0.06 ELSE 0 END) AS total_commission,
        COUNT(DISTINCT lp.id) AS active_products
      FROM applications a
      LEFT JOIN lender_products lp ON lp.lender_id = ${lenderId}
      JOIN lenders l ON l.id = ${lenderId}
      WHERE a.createdAt >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY l.name
    `);

    if (stats.length === 0) {
      return res.json({
        lender_name: "Unknown Lender",
        total_applications_sent: 0,
        approved_count: 0,
        approval_rate: 0,
        avg_response_hours: 0,
        total_commission: 0,
        active_products: 0
      });
    }

    res.json(stats[0]);
  } catch (error: unknown) {
    console.error("Error fetching lender report:", error);
    res.status(500).json({ error: "Failed to fetch lender report" });
  }
});

// Download lender report in CSV/PDF format
router.get("/lenders/:lenderId/report/download", allowPublicAccess, async (req: any, res: any) => {
  try {
    const { lenderId } = req.params;
    const { format = 'csv' } = req.query;

    // Get detailed application data for the lender
    const applications = await db.execute(sql`
      SELECT
        a.id,
        a.business_name,
        a.amount,
        a.status,
        a.createdAt,
        a.updatedAt,
        CASE WHEN a.status = 'funded' THEN a.amount * 0.06 ELSE 0 END AS commission
      FROM applications a
      LEFT JOIN lender_products lp ON lp.lender_id = ${lenderId}
      WHERE a.createdAt >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY a.createdAt DESC
    `);

    if (format === 'csv') {
      const csvHeader = 'Application ID,Business Name,Amount,Status,Created,Updated,Commission\n';
      const csvRows = applications.map(app => 
        `${app.id},${app.business_name || 'N/A'},${app.amount},${app.status},${app.createdAt},${app.updatedAt},${app.commission}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=lender-report-${lenderId}.csv`);
      res.send(csvHeader + csvRows);
    } else {
      // Simple PDF response - in production, use a proper PDF library
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=lender-report-${lenderId}.pdf`);
      res.send('PDF generation not implemented yet - use CSV format');
    }
  } catch (error: unknown) {
    console.error("Error generating report download:", error);
    res.status(500).json({ error: "Failed to generate report download" });
  }
});

// CRM Lender Matching Summary
router.get("/lenders/matching-summary", allowPublicAccess, async (req: any, res: any) => {
  try {
    // Return basic mock data for testing
    const mockData = [
      {
        lender_id: "lender1",
        lender_name: "Test Lender Inc",
        matched_apps: 12,
        sent: 8,
        accepted: 5,
        declined: 2,
        total_commission: 15000
      },
      {
        lender_id: "lender2", 
        lender_name: "Capital Partners LLC",
        matched_apps: 8,
        sent: 6,
        accepted: 3,
        declined: 1,
        total_commission: 9000
      }
    ];

    res.json(mockData);
  } catch (error: unknown) {
    console.error("Error fetching matching summary:", error);
    res.status(500).json({ error: "Failed to fetch matching summary" });
  }
});

// Detailed matches for specific lender
router.get("/lenders/:id/matches", allowPublicAccess, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const matches = await db.execute(sql`
      SELECT
        a.id AS applicationId,
        a.business_name,
        a.amount,
        a.status,
        lp.name AS product,
        CASE WHEN a.status = 'funded' THEN a.amount * l.commission_rate / 100 ELSE 0 END AS commission
      FROM applications a
      LEFT JOIN lender_products lp ON lp.lender_id = ${id}
      JOIN lenders l ON l.id = ${id}
      WHERE a.createdAt >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY a.createdAt DESC
    `);

    res.json(matches);
  } catch (error: unknown) {
    console.error("Error fetching lender matches:", error);
    res.status(500).json({ error: "Failed to fetch lender matches" });
  }
});

export default router;