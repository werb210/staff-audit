import { Router } from 'express';
import { db } from '../db/drizzle';
import { sql } from 'drizzle-orm';
import { getAIMetrics } from '../lib/aiObservability';

const router = Router();

// Admin middleware - restrict to admin users only
function adminOnly(req: any, res: any, next: any) {
  const userRole = req.user?.role || 'user';
  
  if (userRole !== 'admin') {
    return res.status(403).json({
      ok: false,
      error: 'admin_required',
      message: 'Admin access required'
    });
  }
  
  next();
}

// Get all feature flags
router.get('/flags', adminOnly, async (req: any, res: any) => {
  try {
    const flags = await db.execute(sql`
      SELECT flag_key, enabled, config, updatedAt
      FROM ai_feature_flags
      ORDER BY flag_key
    `);
    
    res.json(flags || []);
  } catch (error: unknown) {
    console.error('Failed to get feature flags:', error);
    res.status(500).json({ ok: false, error: 'Failed to get feature flags' });
  }
});

// Update feature flag
router.put('/flags/:flagKey', adminOnly, async (req: any, res: any) => {
  try {
    const { flagKey } = req.params;
    const { enabled } = req.body;
    const userId = req.user?.id || req.user?.claims?.sub;
    
    await db.execute(sql`
      UPDATE ai_feature_flags 
      SET enabled = ${enabled}, updatedAt = NOW(), updated_by = ${userId}
      WHERE flag_key = ${flagKey}
    `);
    
    res.json({ ok: true, message: 'Feature flag updated' });
  } catch (error: unknown) {
    console.error('Failed to update feature flag:', error);
    res.status(500).json({ ok: false, error: 'Failed to update feature flag' });
  }
});

// Get all AI prompts
router.get('/prompts', adminOnly, async (req: any, res: any) => {
  try {
    const prompts = await db.execute(sql`
      SELECT id, prompt_key, version, body, metadata, active, createdAt
      FROM ai_prompts
      WHERE active = true
      ORDER BY prompt_key, version DESC
    `);
    
    res.json(prompts || []);
  } catch (error: unknown) {
    console.error('Failed to get AI prompts:', error);
    res.status(500).json({ ok: false, error: 'Failed to get AI prompts' });
  }
});

// Update AI prompt (creates new version)
router.put('/prompts/:promptKey', adminOnly, async (req: any, res: any) => {
  try {
    const { promptKey } = req.params;
    const { body } = req.body;
    const userId = req.user?.id || req.user?.claims?.sub;
    
    if (!body) {
      return res.status(400).json({
        ok: false,
        error: 'missing_body',
        message: 'Prompt body is required'
      });
    }
    
    // Deactivate current version
    await db.execute(sql`
      UPDATE ai_prompts 
      SET active = false 
      WHERE prompt_key = ${promptKey}
    `);
    
    // Get next version number
    const [lastVersion] = await db.execute(sql`
      SELECT MAX(version) as max_version 
      FROM ai_prompts 
      WHERE prompt_key = ${promptKey}
    `);
    
    const nextVersion = (lastVersion?.max_version || 0) + 1;
    
    // Create new version
    await db.execute(sql`
      INSERT INTO ai_prompts (prompt_key, version, body, active, created_by)
      VALUES (${promptKey}, ${nextVersion}, ${body}, true, ${userId})
    `);
    
    res.json({ 
      ok: true, 
      message: 'Prompt updated',
      version: nextVersion
    });
  } catch (error: unknown) {
    console.error('Failed to update prompt:', error);
    res.status(500).json({ ok: false, error: 'Failed to update prompt' });
  }
});

// Get AI metrics
router.get('/metrics', adminOnly, async (req: any, res: any) => {
  try {
    const { days = 7 } = req.query;
    const tenantId = req.user?.tenant_id || 'bf';
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));
    
    const metrics = await getAIMetrics(tenantId, startDate, endDate);
    
    res.json(metrics);
  } catch (error: unknown) {
    console.error('Failed to get AI metrics:', error);
    res.status(500).json({ ok: false, error: 'Failed to get AI metrics' });
  }
});

// Get AI usage by user
router.get('/usage/users', adminOnly, async (req: any, res: any) => {
  try {
    const { days = 7 } = req.query;
    const tenantId = req.user?.tenant_id || 'bf';
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));
    
    const usage = await db.execute(sql`
      SELECT 
        user_id,
        COUNT(*) as request_count,
        SUM(tokens_used) as total_tokens,
        SUM(cost_cents) as total_cost_cents,
        AVG(latency_ms) as avg_latency,
        AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) as success_rate
      FROM ai_usage
      WHERE tenant_id = ${tenantId}
      AND createdAt >= ${startDate}
      GROUP BY user_id
      ORDER BY request_count DESC
      LIMIT 20
    `);
    
    const formattedUsage = (usage || []).map((row: any) => ({
      userId: row.user_id,
      requestCount: Number(row.request_count),
      totalTokens: Number(row.total_tokens),
      totalCost: Number(row.total_cost_cents) / 100,
      avgLatency: Math.round(Number(row.avg_latency)),
      successRate: Number(row.success_rate)
    }));
    
    res.json(formattedUsage);
  } catch (error: unknown) {
    console.error('Failed to get user usage:', error);
    res.status(500).json({ ok: false, error: 'Failed to get user usage' });
  }
});

// Emergency disable all AI features
router.post('/emergency-disable', adminOnly, async (req: any, res: any) => {
  try {
    const userId = req.user?.id || req.user?.claims?.sub;
    
    await db.execute(sql`
      UPDATE ai_feature_flags 
      SET enabled = false, updatedAt = NOW(), updated_by = ${userId}
      WHERE enabled = true
    `);
    
    res.json({ 
      ok: true, 
      message: 'All AI features disabled',
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    console.error('Failed to emergency disable:', error);
    res.status(500).json({ ok: false, error: 'Failed to disable AI features' });
  }
});

export default router;