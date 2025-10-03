import express from 'express';
import { db } from '../../db';
import { recommendationLogs, insertRecommendationLogSchema } from '../../../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

const router = express.Router();

/**
 * POST /api/analytics/recommendation-log
 * Log recommendation engine attempts and results
 */
router.post('/recommendation-log', async (req, res) => {
  try {
    const { applicantId, recommendedLenders, rejectedLenders, filtersApplied } = req.body;

    console.log(`📊 [RECOMMENDATION-LOG] Logging for applicant: ${applicantId}`);
    
    // Validate required fields
    if (!applicantId) {
      return res.status(400).json({
        success: false,
        error: 'applicantId is required'
      });
    }

    // Insert recommendation log entry using Drizzle
    const logEntry = await db.insert(recommendationLogs).values({
      applicantId,
      recommendedLenders: recommendedLenders || [],
      rejectedLenders: rejectedLenders || [],
      filtersApplied: filtersApplied || []
    }).returning();

    console.log(`✅ [RECOMMENDATION-LOG] Created log entry for ${applicantId}`);

    res.json({
      success: true,
      logId: logEntry[0]?.id,
      timestamp: logEntry[0]?.createdAt,
      message: 'Recommendation log created successfully'
    });

  } catch (error) {
    console.error('❌ [RECOMMENDATION-LOG] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create recommendation log',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/analytics/recommendation-logs/:applicantId
 * Get historical recommendation logs for specific applicant
 */
router.get('/recommendation-logs/:applicantId', async (req, res) => {
  try {
    const { applicantId } = req.params;

    console.log(`📊 [RECOMMENDATION-LOG] Fetching logs for applicant: ${applicantId}`);

    const logs = await db.select().from(recommendationLogs)
      .where(eq(recommendationLogs.applicantId, applicantId))
      .orderBy(desc(recommendationLogs.createdAt));

    // Parse JSON fields for frontend consumption
    const processedLogs = logs.map(log => {
      try {
        // Handle comma-separated values by converting to arrays
        const parseField = (field: any) => {
          if (!field) return [];
          if (Array.isArray(field)) return field;
          if (typeof field === 'string') {
            // Try JSON parse first
            try {
              return JSON.parse(field);
            } catch {
              // If not JSON, split by comma and clean
              return field.split(',').map(item => item.trim()).filter(Boolean);
            }
          }
          return [];
        };

        return {
          ...log,
          recommended_lenders: parseField(log.recommendedLenders),
          rejected_lenders: parseField(log.rejectedLenders),
          filters_applied: parseField(log.filtersApplied),
        };
      } catch (parseError) {
        console.error('❌ [RECOMMENDATION-LOG] Parse error for log:', log.id, parseError);
        return {
          ...log,
          recommended_lenders: [],
          rejected_lenders: [],
          filters_applied: [],
        };
      }
    });

    console.log(`📊 [RECOMMENDATION-LOG] Found ${processedLogs.length} logs for applicant ${applicantId}`);

    res.json({
      success: true,
      logs: processedLogs,
      total: processedLogs.length,
      applicantId
    });

  } catch (error) {
    console.error('❌ [RECOMMENDATION-LOG] Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recommendation logs',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/analytics/recommendation-dashboard
 * Get dashboard analytics for recommendation engine
 */
router.get('/recommendation-dashboard', async (req, res) => {
  try {
    console.log('📊 [RECOMMENDATION-DASHBOARD] Generating analytics');

    // Get top rejection reasons using Drizzle with raw SQL for complex PostgreSQL functions
    const rejectionReasons = await db.execute(sql`
      SELECT 
        jsonb_array_elements_text(rejected_lenders::jsonb) as reason,
        COUNT(*) as count
      FROM recommendation_logs
      WHERE rejected_lenders != '[]'
      GROUP BY reason
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get most recommended lenders using Drizzle with raw SQL for complex PostgreSQL functions  
    const topLenders = await db.execute(sql`
      SELECT 
        jsonb_array_elements_text(recommended_lenders::jsonb) as lender,
        COUNT(*) as count
      FROM recommendation_logs
      WHERE recommended_lenders != '[]'
      GROUP BY lender
      ORDER BY count DESC
      LIMIT 10
    `);

    // Get total statistics using Drizzle with raw SQL for complex PostgreSQL functions
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_recommendations,
        COUNT(CASE WHEN recommended_lenders != '[]' THEN 1 END) as successful_matches,
        COUNT(CASE WHEN rejected_lenders != '[]' THEN 1 END) as rejections,
        AVG(jsonb_array_length(recommended_lenders::jsonb)) as avg_recommendations_per_applicant
      FROM recommendation_logs
    `);

    const statsData = Array.isArray(stats) && stats.length > 0 ? stats[0] : {};
    
    res.json({
      success: true,
      dashboard: {
        stats: statsData,
        topRejectionReasons: rejectionReasons || [],
        mostRecommendedLenders: topLenders || []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [RECOMMENDATION-DASHBOARD] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendation dashboard',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;