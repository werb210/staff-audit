import { db } from '../db/drizzle';
import { sql } from 'drizzle-orm';

export interface AIMetrics {
  action: string;
  userId?: string;
  tenantId: string;
  applicationId?: string;
  contactId?: string;
  requestId?: string;
  model: string;
  tokensUsed: number;
  latencyMs: number;
  costCents: number;
  cached: boolean;
  success: boolean;
  errorCode?: string;
}

export async function trackAIUsage(metrics: AIMetrics) {
  try {
    await db.execute(sql`
      INSERT INTO ai_usage (
        action, user_id, tenant_id, application_id, contact_id,
        request_id, model, tokens_used, latency_ms, cost_cents,
        cached, success, error_code
      ) VALUES (
        ${metrics.action}, ${metrics.userId}, ${metrics.tenantId},
        ${metrics.applicationId}, ${metrics.contactId}, ${metrics.requestId},
        ${metrics.model}, ${metrics.tokensUsed}, ${metrics.latencyMs},
        ${metrics.costCents}, ${metrics.cached}, ${metrics.success},
        ${metrics.errorCode}
      )
    `);
  } catch (error) {
    console.error('Failed to track AI usage:', error);
  }
}

export async function checkRateLimit(userId: string, action: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: Date;
}> {
  const windowStart = new Date();
  windowStart.setMinutes(Math.floor(windowStart.getMinutes() / 15) * 15, 0, 0); // 15-minute window
  
  try {
    // Get or create rate limit record
    const [record] = await db.execute(sql`
      INSERT INTO ai_rate_limits (user_id, action, window_start, request_count)
      VALUES (${userId}, ${action}, ${windowStart}, 1)
      ON CONFLICT (user_id, action, window_start)
      DO UPDATE SET request_count = ai_rate_limits.request_count + 1
      RETURNING request_count
    `);
    
    const { RATE_LIMITS } = await import('./aiSecurity');
    const limit = RATE_LIMITS[action as keyof typeof RATE_LIMITS] || RATE_LIMITS.default;
    const count = record?.request_count || 0;
    
    const resetTime = new Date(windowStart);
    resetTime.setMinutes(resetTime.getMinutes() + 15);
    
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetTime
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open in case of database issues
    return {
      allowed: true,
      remaining: 100,
      resetTime: new Date(Date.now() + 15 * 60 * 1000)
    };
  }
}

export async function getAIMetrics(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalRequests: number;
  totalCost: number;
  avgLatency: number;
  successRate: number;
  topActions: Array<{ action: string; count: number; cost: number }>;
  dailyUsage: Array<{ date: string; requests: number; cost: number }>;
}> {
  try {
    // Total metrics
    const [totals] = await db.execute(sql`
      SELECT 
        COUNT(*) as total_requests,
        SUM(cost_cents) as total_cost_cents,
        AVG(latency_ms) as avg_latency,
        AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) as success_rate
      FROM ai_usage
      WHERE tenant_id = ${tenantId}
      AND created_at BETWEEN ${startDate} AND ${endDate}
    `);
    
    // Top actions
    const topActions = await db.execute(sql`
      SELECT 
        action,
        COUNT(*) as count,
        SUM(cost_cents) as cost_cents
      FROM ai_usage
      WHERE tenant_id = ${tenantId}
      AND created_at BETWEEN ${startDate} AND ${endDate}
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // Daily usage
    const dailyUsage = await db.execute(sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as requests,
        SUM(cost_cents) as cost_cents
      FROM ai_usage
      WHERE tenant_id = ${tenantId}
      AND created_at BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    
    return {
      totalRequests: Number(totals?.total_requests || 0),
      totalCost: Number(totals?.total_cost_cents || 0) / 100, // Convert to dollars
      avgLatency: Number(totals?.avg_latency || 0),
      successRate: Number(totals?.success_rate || 0),
      topActions: (topActions || []).map((row: any) => ({
        action: row.action,
        count: Number(row.count),
        cost: Number(row.cost_cents) / 100
      })),
      dailyUsage: (dailyUsage || []).map((row: any) => ({
        date: row.date,
        requests: Number(row.requests),
        cost: Number(row.cost_cents) / 100
      }))
    };
  } catch (error) {
    console.error('Failed to get AI metrics:', error);
    return {
      totalRequests: 0,
      totalCost: 0,
      avgLatency: 0,
      successRate: 0,
      topActions: [],
      dailyUsage: []
    };
  }
}

export async function emitAIEvent(
  event: 'ai.action.requested' | 'ai.action.complete' | 'ai.action.error',
  data: {
    action: string;
    userId?: string;
    tenantId: string;
    applicationId?: string;
    requestId?: string;
    latency?: number;
    error?: string;
  }
) {
  try {
    // Log structured event
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event,
      ...data
    }));
    
    // Could also send to external monitoring service here
    // e.g., DataDog, New Relic, etc.
    
  } catch (error) {
    console.error('Failed to emit AI event:', error);
  }
}