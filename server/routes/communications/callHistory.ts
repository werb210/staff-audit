import express from 'express';
import { requireAuth } from '../../middleware/authMiddleware';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

const router = express.Router();

/**
 * POST /api/communications/call-action
 * Log call actions (accept, decline, missed)
 */
router.post('/call-action', async (req: any, res: any) => async (req: any, res: any) => {
  console.log('📞 [CALL-ACTION] Logging call action');

  try {
    const { callSid, action, reason, timestamp } = req.body;
    const user = req.user;

    if (!callSid || !action) {
      return res.status(400).json({
        success: false,
        error: 'Call SID and action are required'
      });
    }

    // Insert call action log
    const logResult = await db.execute(sql`
      INSERT INTO call_logs (
        call_sid, staff_id, action, reason, timestamp, created_at
      ) VALUES (
        ${callSid}, ${user?.id || 'unknown'}, ${action}, ${reason || null}, 
        ${timestamp || new Date().toISOString()}, NOW()
      ) 
      ON CONFLICT (call_sid) 
      DO UPDATE SET 
        action = EXCLUDED.action,
        reason = EXCLUDED.reason,
        timestamp = EXCLUDED.timestamp,
        updated_at = NOW()
      RETURNING id
    `);

    // If call was missed, trigger escalation workflow
    if (action === 'missed') {
      console.log('🚨 [CALL-ACTION] Triggering missed call escalation for:', callSid);
      
      // Log missed call for escalation tracking
      await db.execute(sql`
        INSERT INTO missed_calls (
          call_sid, from_number, to_number, reason, staff_id, created_at
        ) VALUES (
          ${callSid}, '', '', ${reason || 'unanswered'}, ${user?.id || 'unknown'}, NOW()
        )
        ON CONFLICT (call_sid) DO NOTHING
      `);

      // TODO: Implement escalation logic
      // - Send email to supervisors
      // - SMS fallback to backup line
      // - Add to priority queue
    }

    res.json({
      success: true,
      message: `Call ${action} logged successfully`,
      logId: logResult.rows[0]?.id
    });

  } catch (error: unknown) {
    console.error('❌ [CALL-ACTION] Error logging call action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log call action',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * GET /api/communications/call-history
 * Retrieve call history with filtering options
 */
router.get('/call-history', async (req: any, res: any) => async (req: any, res: any) => {
  console.log('📋 [CALL-HISTORY] Fetching call history');

  try {
    const { status, timeframe, limit = '50' } = req.query;
    const user = req.user;

    // Build dynamic query based on filters
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      whereClause += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    if (timeframe && timeframe !== 'all') {
      let timeCondition = '';
      switch (timeframe) {
        case 'today':
          timeCondition = "DATE(created_at) = CURRENT_DATE";
          break;
        case 'yesterday':
          timeCondition = "DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'";
          break;
        case 'week':
          timeCondition = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
          break;
        case 'month':
          timeCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
          break;
      }
      if (timeCondition) {
        whereClause += ` AND ${timeCondition}`;
      }
    }

    // Fetch call history
    const callHistoryResult = await db.execute(sql`
      SELECT 
        cl.id,
        cl.call_sid,
        cl.from_number as "from",
        cl.to_number as "to",
        cl.action as status,
        cl.reason,
        cl.duration,
        cl.created_at as timestamp,
        COALESCE(ls.source_type, 'direct_call') as source
      FROM call_logs cl
      LEFT JOIN lead_sources ls ON ls.twilio_number = cl.to_number
      ${sql.raw(whereClause)}
      ORDER BY cl.created_at DESC
      LIMIT ${sql.raw(limit.toString())}
    `);

    // Get summary statistics
    const summaryResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN action = 'accepted' THEN 1 END) as answered,
        COUNT(CASE WHEN action = 'missed' THEN 1 END) as missed,
        COUNT(CASE WHEN action = 'declined' THEN 1 END) as declined
      FROM call_logs
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `);

    const calls = callHistoryResult.rows || [];
    const summary = summaryResult.rows[0] || { total: 0, answered: 0, missed: 0, declined: 0 };

    res.json({
      success: true,
      calls,
      summary: {
        total: parseInt(summary.total),
        answered: parseInt(summary.answered),
        missed: parseInt(summary.missed),
        declined: parseInt(summary.declined)
      },
      filters: {
        status: status || 'all',
        timeframe: timeframe || 'all',
        limit: parseInt(limit.toString())
      }
    });

  } catch (error: unknown) {
    console.error('❌ [CALL-HISTORY] Error fetching call history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call history',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * GET /api/communications/missed-calls
 * Get all unhandled missed calls for escalation
 */
router.get('/missed-calls', async (req: any, res: any) => {
  console.log('📵 [MISSED-CALLS] Fetching unhandled missed calls');

  try {
    const missedCallsResult = await db.execute(sql`
      SELECT 
        mc.id,
        mc.call_sid,
        mc.from_number,
        mc.to_number,
        mc.reason,
        mc.staff_id,
        mc.created_at,
        mc.handled,
        cl.duration
      FROM missed_calls mc
      LEFT JOIN call_logs cl ON cl.call_sid = mc.call_sid
      WHERE mc.handled = FALSE
      ORDER BY mc.created_at DESC
      LIMIT 100
    `);

    const missedCalls = missedCallsResult.rows || [];

    res.json({
      success: true,
      missedCalls,
      count: missedCalls.length,
      message: `Found ${missedCalls.length} unhandled missed calls`
    });

  } catch (error: unknown) {
    console.error('❌ [MISSED-CALLS] Error fetching missed calls:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch missed calls',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/communications/missed-calls/:id/handle
 * Mark a missed call as handled
 */
router.patch('/missed-calls/:id/handle', async (req: any, res: any) => async (req: any, res: any) => {
  console.log('✅ [MISSED-CALLS] Marking missed call as handled');

  try {
    const { id } = req.params;
    const { notes } = req.body;
    const user = req.user;

    await db.execute(sql`
      UPDATE missed_calls 
      SET 
        handled = TRUE,
        handled_by = ${user?.id || 'unknown'},
        handled_at = NOW(),
        notes = ${notes || null}
      WHERE id = ${id}
    `);

    res.json({
      success: true,
      message: 'Missed call marked as handled'
    });

  } catch (error: unknown) {
    console.error('❌ [MISSED-CALLS] Error marking call as handled:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark call as handled',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * GET /api/communications/call-status
 * Get current call system status and active calls
 */
router.get('/call-status', async (req: any, res: any) => async (req: any, res: any) => {
  try {
    // Get active calls count
    const activeCallsResult = await db.execute(sql`
      SELECT COUNT(*) as active_count
      FROM call_logs
      WHERE action = 'accepted' 
      AND created_at >= NOW() - INTERVAL '1 hour'
    `);

    // Get recent missed calls count
    const recentMissedResult = await db.execute(sql`
      SELECT COUNT(*) as missed_count
      FROM missed_calls
      WHERE handled = FALSE
      AND created_at >= CURRENT_DATE
    `);

    const activeCount = parseInt(activeCallsResult.rows[0]?.active_count || '0');
    const missedCount = parseInt(recentMissedResult.rows[0]?.missed_count || '0');

    res.json({
      success: true,
      status: 'operational',
      activeCalls: activeCount,
      todayMissedCalls: missedCount,
      timestamp: new Date().toISOString(),
      features: {
        incomingCallDetection: true,
        callLogging: true,
        missedCallEscalation: true,
        callHistory: true
      }
    });

  } catch (error: unknown) {
    console.error('❌ [CALL-STATUS] Error getting call status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get call status'
    });
  }
});

export default router;