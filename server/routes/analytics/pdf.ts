import { Router } from "express";
const q = pool.query.bind(pool);
import { pool } from "../../db/pool";
import { renderToBuffer } from "@react-pdf/renderer";
import { AnalyticsPdf } from "../../services/analyticsPdf";
import dayjs from "dayjs";

const router = Router();

// Generate PDF report on demand
router.get("/monthly-pdf", async (req: any, res: any) => {
  try {
    const month = req.query.month || dayjs().format("YYYY-MM");
    const startDate = dayjs(month + "-01").format("YYYY-MM-DD");
    const endDate = dayjs(month + "-01").endOf("month").format("YYYY-MM-DD");

    console.log(`📊 Generating analytics PDF for ${month}...`);

    // Fetch activity data
    const [activity] = await q<any>(`
      SELECT
        (SELECT COUNT(*) FROM applications a WHERE a.created_at BETWEEN $1::date AND $2::date + INTERVAL '1 day') AS apps_this_period,
        (SELECT COUNT(*) FROM applications WHERE stage='Requires Docs') AS requires_docs,
        (SELECT COUNT(*) FROM applications WHERE stage='In Review') AS in_review,
        (SELECT COUNT(*) FROM applications WHERE stage='Off to Lender') AS lenders,
        (SELECT COUNT(*) FROM applications WHERE stage='Accepted') AS sent,
        (SELECT COUNT(*) FROM applications WHERE stage='Accepted') AS funded_total
    `, [startDate, endDate]);

    // Fetch conversion data
    const [conversion] = await q<any>(`
      SELECT
        COALESCE(SUM(requires_docs), 0) AS requires_docs,
        COALESCE(SUM(in_review), 0) AS in_review,
        COALESCE(SUM(lenders), 0) AS lenders,
        COALESCE(SUM(sent), 0) AS sent,
        COALESCE(SUM(funded), 0) AS funded
      FROM mv_app_stage_counts
      WHERE day BETWEEN $1::date AND $2::date
    `, [startDate, endDate]);

    // Fetch document data
    const [docSummary] = await q<any>(`
      SELECT
        COALESCE(SUM(apps_with_rejects), 0)::int AS apps_with_rejects,
        COALESCE(SUM(apps_missing_docs), 0)::int AS apps_missing_docs,
        COALESCE(SUM(apps_all_accepted), 0)::int AS apps_all_accepted
      FROM mv_doc_status
      WHERE month BETWEEN $1::date AND $2::date
    `, [startDate, endDate]);

    const topRejects = await q<any>(`
      SELECT * FROM mv_reject_categories LIMIT 10
    `);

    // Fetch lender data
    const lenders = await q<any>(`
      SELECT lender_name, category, matched, funded_count, COALESCE(avg_hours_to_decision,0) AS avg_hours_to_decision
      FROM mv_lender_perf
      LIMIT 10
    `);

    const documents = {
      summary: docSummary || {},
      topRejects: topRejects || []
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      AnalyticsPdf({
        activity: activity || {},
        conversion: conversion || {},
        documents,
        lenders: lenders || []
      })
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${month}.pdf"`);
    res.send(pdfBuffer);

    console.log(`✅ Analytics PDF generated successfully for ${month}`);
  } catch (error: unknown) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

// Schedule monthly PDF email (placeholder)
router.post("/schedule-monthly", async (req: any, res: any) => {
  try {
    // This would integrate with the automated reminders system
    // For now, just return success
    console.log("📧 Monthly PDF email scheduling requested");
    res.json({ 
      success: true, 
      message: "Monthly PDF email scheduling configured (placeholder)" 
    });
  } catch (error: unknown) {
    console.error('Schedule monthly PDF error:', error);
    res.status(500).json({ error: 'Failed to schedule monthly PDF' });
  }
});

export default router;