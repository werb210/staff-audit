import { Router } from "express";
const q = pool.query.bind(pool);
import { pool } from "../../db/pool";
import dayjs from "dayjs";
import pdfRouter from "./pdf";

const router = Router();

router.use("/pdf", pdfRouter);

router.post("/refresh", async (_req, res) => {
  try {
    await q(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_app_stage_counts`);
    await q(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_stage_timings`);
    await q(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_doc_status`);
    await q(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_reject_categories`);
    await q(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_lender_perf`);
    res.json({ ok: true });
  } catch (error: unknown) {
    console.error('Analytics refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh analytics' });
  }
});

router.get("/activity", async (req: any, res: any) => {
  try {
    const start = req.query.start || dayjs().startOf("month").format("YYYY-MM-DD");
    const end = req.query.end || dayjs().endOf("month").format("YYYY-MM-DD");
    
    const [result] = await q<any>(`
      SELECT
        (SELECT COUNT(*) FROM applications a WHERE a.created_at BETWEEN $1::date AND $2::date + INTERVAL '1 day') AS apps_this_period,
        (SELECT COUNT(*) FROM applications WHERE stage='Requires Docs') AS requires_docs,
        (SELECT COUNT(*) FROM applications WHERE stage='In Review') AS in_review,
        (SELECT COUNT(*) FROM applications WHERE stage='Off to Lender') AS lenders,
        (SELECT COUNT(*) FROM applications WHERE stage='Accepted') AS sent,
        (SELECT COUNT(*) FROM applications WHERE stage='Accepted') AS funded_total
    `, [start, end]);
    
    res.json(result || {});
  } catch (error: unknown) {
    console.error('Activity analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch activity analytics' });
  }
});

router.get("/conversion", async (_req, res) => {
  try {
    const [result] = await q<any>(`
      SELECT
        COALESCE(SUM(requires_docs), 0) AS requires_docs,
        COALESCE(SUM(in_review), 0) AS in_review,
        COALESCE(SUM(lenders), 0) AS lenders,
        COALESCE(SUM(sent), 0) AS sent,
        COALESCE(SUM(funded), 0) AS funded
      FROM mv_app_stage_counts
    `);
    
    res.json(result || {});
  } catch (error: unknown) {
    console.error('Conversion analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch conversion analytics' });
  }
});

router.get("/documents", async (_req, res) => {
  try {
    const [summary] = await q<any>(`
      SELECT
        COALESCE(SUM(apps_with_rejects), 0)::int AS apps_with_rejects,
        COALESCE(SUM(apps_missing_docs), 0)::int AS apps_missing_docs,
        COALESCE(SUM(apps_all_accepted), 0)::int AS apps_all_accepted
      FROM mv_doc_status
    `);
    
    const topRejects = await q<any>(`SELECT * FROM mv_reject_categories LIMIT 15`);
    
    res.json({ summary: summary || {}, topRejects: topRejects || [] });
  } catch (error: unknown) {
    console.error('Documents analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch documents analytics' });
  }
});

router.get("/lenders", async (req: any, res: any) => {
  try {
    const country = req.query.country || null;
    const category = req.query.category || null;
    
    const results = await q<any>(`
      SELECT lender_name, category, matched, funded_count, COALESCE(avg_hours_to_decision,0) AS avg_hours_to_decision
      FROM mv_lender_perf
    `);
    
    res.json(results || []);
  } catch (error: unknown) {
    console.error('Lenders analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch lenders analytics' });
  }
});

router.get("/ga4-overlay", async (req: any, res: any) => {
  try {
    const start = String(req.query.start || dayjs().subtract(30,'day').format('YYYY-MM-DD'));
    const end   = String(req.query.end || dayjs().format('YYYY-MM-DD'));
    
    // Import GA4 service
    const { getGa4Attribution } = await import('../../services/ga4');
    const ga4 = await getGa4Attribution({ startDate: start, endDate: end });
    
    // Use simplified query for now since utm fields may not exist
    const funded = await q<any>(`
      SELECT 'direct' as utm_source_medium, COUNT(*)::int AS funded_count
      FROM applications
      WHERE stage='Accepted'
      GROUP BY 1
    `);
    
    res.json({ ga4, funded: funded || [] });
  } catch (error: unknown) {
    console.error('GA4 overlay analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch GA4 analytics' });
  }
});

export default router;