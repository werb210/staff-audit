import express from "express";
import { eq, desc, sql } from "drizzle-orm";
// Drizzle DB and schema
import { db } from "../../db/drizzle";
import { recommendationLogs, insertRecommendationLogSchema, } from "../../../shared/schema";
const router = express.Router();
/**
 * POST /api/analytics/recommendation-log
 * Log recommendation engine attempts and results
 */
router.post("/recommendation-log", async (req, res) => {
    try {
        // Validate input with the shared Zod schema if present
        const parsed = typeof insertRecommendationLogSchema?.parse === "function"
            ? insertRecommendationLogSchema.parse(req.body)
            : req.body;
        const { applicantId, recommendedLenders = [], rejectedLenders = [], filtersApplied = [], } = parsed || {};
        if (!applicantId) {
            return res.status(400).json({ success: false, error: "applicantId is required" });
        }
        console.log(`📊 [RECOMMENDATION-LOG] Logging for applicant: ${applicantId}`);
        const [row] = await db
            .insert(recommendationLogs)
            .values({
            applicantId,
            recommendedLenders,
            rejectedLenders,
            filtersApplied,
        })
            .returning();
        console.log(`✅ [RECOMMENDATION-LOG] Created log entry for ${applicantId}`);
        return res.json({
            success: true,
            logId: row?.id,
            timestamp: row?.createdAt,
            message: "Recommendation log created successfully",
        });
    }
    catch (error) {
        console.error("❌ [RECOMMENDATION-LOG] Error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to create recommendation log",
            details: error?.message ?? String(error),
        });
    }
});
/**
 * GET /api/analytics/recommendation-logs/:applicantId
 * Get historical recommendation logs for specific applicant
 */
router.get("/recommendation-logs/:applicantId", async (req, res) => {
    try {
        const { applicantId } = req.params;
        if (!applicantId) {
            return res.status(400).json({ success: false, error: "applicantId is required" });
        }
        console.log(`📊 [RECOMMENDATION-LOG] Fetching logs for applicant: ${applicantId}`);
        const rows = await db
            .select()
            .from(recommendationLogs)
            .where(eq(recommendationLogs.applicantId, applicantId))
            .orderBy(desc(recommendationLogs.createdAt));
        // Normalize possibly-stringified JSON arrays
        const normalize = (v) => {
            if (!v)
                return [];
            if (Array.isArray(v))
                return v;
            if (typeof v === "string") {
                try {
                    const parsed = JSON.parse(v);
                    if (Array.isArray(parsed))
                        return parsed;
                    return v.split(",").map((s) => s.trim()).filter(Boolean);
                }
                catch {
                    return v.split(",").map((s) => s.trim()).filter(Boolean);
                }
            }
            return [];
        };
        const logs = rows.map((r) => ({
            ...r,
            recommended_lenders: normalize(r.recommendedLenders),
            rejected_lenders: normalize(r.rejectedLenders),
            filters_applied: normalize(r.filtersApplied),
        }));
        console.log(`📊 [RECOMMENDATION-LOG] Found ${logs.length} logs for ${applicantId}`);
        return res.json({ success: true, logs, total: logs.length, applicantId });
    }
    catch (error) {
        console.error("❌ [RECOMMENDATION-LOG] Error fetching logs:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to fetch recommendation logs",
            details: error?.message ?? String(error),
        });
    }
});
/**
 * GET /api/analytics/recommendation-dashboard
 * Aggregate dashboard analytics for recommendation engine
 */
router.get("/recommendation-dashboard", async (_req, res) => {
    try {
        console.log("📊 [RECOMMENDATION-DASHBOARD] Generating analytics");
        // postgres jsonb expansion via raw SQL
        const rejectionReasonsResult = await db.execute(sql /*sql*/ `
        SELECT
          jsonb_array_elements_text(rejected_lenders::jsonb) AS reason,
          COUNT(*)::int AS count
        FROM ${recommendationLogs}
        WHERE rejected_lenders IS NOT NULL AND rejected_lenders <> '[]'
        GROUP BY reason
        ORDER BY count DESC
        LIMIT 10
      `);
        const topLendersResult = await db.execute(sql /*sql*/ `
        SELECT
          jsonb_array_elements_text(recommended_lenders::jsonb) AS lender,
          COUNT(*)::int AS count
        FROM ${recommendationLogs}
        WHERE recommended_lenders IS NOT NULL AND recommended_lenders <> '[]'
        GROUP BY lender
        ORDER BY count DESC
        LIMIT 10
      `);
        const statsResult = await db.execute(sql /*sql*/ `
        SELECT
          COUNT(*)::int AS total_recommendations,
          COUNT(CASE WHEN recommended_lenders IS NOT NULL AND recommended_lenders <> '[]' THEN 1 END)::int AS successful_matches,
          COUNT(CASE WHEN rejected_lenders IS NOT NULL AND rejected_lenders <> '[]' THEN 1 END)::int AS rejections,
          COALESCE(AVG(jsonb_array_length(recommended_lenders::jsonb)), 0)::float AS avg_recommendations_per_applicant
        FROM ${recommendationLogs}
      `);
        const stats = (Array.isArray(statsResult.rows)
            ? statsResult.rows[0]
            : Array.isArray(statsResult)
                ? statsResult[0]
                : statsResult) || {};
        const topRejectionReasons = (Array.isArray(rejectionReasonsResult.rows)
            ? rejectionReasonsResult.rows
            : rejectionReasonsResult) || [];
        const mostRecommendedLenders = (Array.isArray(topLendersResult.rows)
            ? topLendersResult.rows
            : topLendersResult) || [];
        return res.json({
            success: true,
            dashboard: {
                stats,
                topRejectionReasons,
                mostRecommendedLenders,
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("❌ [RECOMMENDATION-DASHBOARD] Error:", error);
        return res.status(500).json({
            success: false,
            error: "Failed to generate recommendation dashboard",
            details: error?.message ?? String(error),
        });
    }
});
export default router;
