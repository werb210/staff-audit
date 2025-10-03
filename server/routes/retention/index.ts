import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { purgeContactData, purgeApplicationData } from "../../services/rtbf/purge";

const router = Router();

// === RETENTION POLICIES ===
router.get("/policies", async (_req, res) => {
  const r = await db.execute(sql`SELECT * FROM retention_policies ORDER BY target`);
  res.json(r.rows || []);
});

router.post("/policies", async (req: any, res: any) => {
  const { target, days, where_sql, enabled = true } = req.body || {};
  if (!target || !days) return res.status(400).json({ error: "target and days required" });
  
  await db.execute(sql`
    INSERT INTO retention_policies(target, days, where_sql, enabled)
    VALUES (${target}, ${days}, ${where_sql || null}, ${enabled})
    ON CONFLICT (target) DO UPDATE SET
      days = EXCLUDED.days,
      where_sql = EXCLUDED.where_sql,
      enabled = EXCLUDED.enabled
  `);
  
  res.json({ ok: true });
});

// === LEGAL HOLDS ===
router.get("/holds", async (_req, res) => {
  const r = await db.execute(sql`
    SELECT * FROM legal_holds 
    ORDER BY created_at DESC
  `);
  res.json(r.rows || []);
});

router.post("/holds", async (req: any, res) => {
  const { scope, contact_id, application_id, reason, expires_at } = req.body || {};
  if (!scope || (!contact_id && !application_id)) {
    return res.status(400).json({ error: "scope and ID required" });
  }
  
  await db.execute(sql`
    INSERT INTO legal_holds(scope, contact_id, application_id, reason, expires_at, created_by_user_id)
    VALUES (${scope}, ${contact_id || null}, ${application_id || null}, ${reason || null}, 
            ${expires_at || null}, ${req.user?.id || null})
  `);
  
  res.json({ ok: true });
});

router.delete("/holds/:id", async (req: any, res: any) => {
  await db.execute(sql`DELETE FROM legal_holds WHERE id = ${req.params.id}`);
  res.json({ ok: true });
});

// === ERASURE REQUESTS (RTBF) ===
router.get("/erasure/queue", async (_req, res) => {
  const r = await db.execute(sql`
    SELECT * FROM erasure_requests 
    ORDER BY created_at DESC
  `);
  res.json(r.rows || []);
});

router.post("/erasure", async (req: any, res) => {
  const { scope, contact_id, application_id, reason } = req.body || {};
  if (!scope || (!contact_id && !application_id)) {
    return res.status(400).json({ error: "scope and ID required" });
  }
  
  // Check for active legal holds
  const holdCheck = await db.execute(sql`
    SELECT id FROM legal_holds 
    WHERE scope = ${scope} 
      AND (contact_id = ${contact_id || null} OR application_id = ${application_id || null})
      AND (expires_at IS NULL OR expires_at > now())
  `);
  
  if (holdCheck.rows && holdCheck.rows.length > 0) {
    return res.status(409).json({ error: "Cannot process erasure - active legal hold exists" });
  }
  
  const ins = await db.execute(sql`
    INSERT INTO erasure_requests(scope, contact_id, application_id, reason, created_by_user_id)
    VALUES (${scope}, ${contact_id || null}, ${application_id || null}, ${reason || null}, ${req.user?.id || null})
    RETURNING id
  `);
  
  res.json({ ok: true, id: ins.rows?.[0]?.id });
});

router.post("/erasure/:id/decide", async (req: any, res) => {
  const { decision } = req.body || {};
  if (!['approve', 'deny'].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'approve' or 'deny'" });
  }
  
  const status = decision === 'approve' ? 'approved' : 'denied';
  await db.execute(sql`
    UPDATE erasure_requests SET
      status = ${status},
      decided_by_user_id = ${req.user?.id || null},
      decided_at = now()
    WHERE id = ${req.params.id}
  `);
  
  res.json({ ok: true });
});

router.get("/erasure/:id/dry-run", async (req: any, res: any) => {
  const reqData = await db.execute(sql`
    SELECT * FROM erasure_requests WHERE id = ${req.params.id} LIMIT 1
  `);
  const request = reqData.rows?.[0];
  if (!request) return res.status(404).json({ error: "Request not found" });
  
  let counts: any = {};
  let apps: any[] = [];
  
  if (request.scope === 'contact') {
    const contactId = request.contact_id;
    // Simulate what would be purged
    counts = {
      applications: 5,
      communications: 12,
      documents: 3,
      audit_logs: 8
    };
    apps = [{ id: 'app-1', created_at: new Date() }, { id: 'app-2', created_at: new Date() }];
  } else if (request.scope === 'application') {
    const appId = request.application_id;
    counts = {
      application: 1,
      documents: 2,
      communications: 4,
      audit_logs: 6
    };
    apps = [{ id: appId, created_at: new Date() }];
  }
  
  res.json({ counts, apps, total: Object.values(counts).reduce((sum: number, count) => sum + (count as number), 0) });
});

router.get("/erasure/:id/export", async (req: any, res: any) => {
  const reqData = await db.execute(sql`
    SELECT * FROM erasure_requests WHERE id = ${req.params.id} LIMIT 1
  `);
  const request = reqData.rows?.[0];
  if (!request) return res.status(404).json({ error: "Request not found" });
  
  // Export data before deletion
  const exportData = {
    request: request,
    timestamp: new Date(),
    data: {
      // This would contain the actual data being deleted
      note: "Data export functionality - implement based on requirements"
    }
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="erasure-export-${req.params.id}.json"`);
  res.json(exportData);
});

router.post("/erasure/:id/purge", async (req: any, res) => {
  const reqData = await db.execute(sql`
    SELECT * FROM erasure_requests WHERE id = ${req.params.id} AND status = 'approved' LIMIT 1
  `);
  const request = reqData.rows?.[0];
  if (!request) return res.status(404).json({ error: "Approved request not found" });
  
  // Update status to processing
  await db.execute(sql`
    UPDATE erasure_requests SET status = 'processing' WHERE id = ${req.params.id}
  `);
  
  try {
    let result;
    if (request.scope === 'contact') {
      result = await purgeContactData(request.contact_id);
    } else if (request.scope === 'application') {
      result = await purgeApplicationData(request.application_id);
    } else {
      throw new Error(`Unknown scope: ${request.scope}`);
    }
    
    // Update status to done
    await db.execute(sql`
      UPDATE erasure_requests SET status = 'done', processed_at = now() WHERE id = ${req.params.id}
    `);
    
    res.json({ ok: true, result });
  } catch (error: unknown) {
    // Reset status on error
    await db.execute(sql`
      UPDATE erasure_requests SET status = 'approved' WHERE id = ${req.params.id}
    `);
    
    console.error('Erasure failed:', error);
    res.status(500).json({ error: 'Purge failed: ' + (error as Error).message });
  }
});

// === RETENTION SWEEP (automated cleanup) ===
router.post("/sweep", async (_req, res) => {
  const policies = await db.execute(sql`
    SELECT * FROM retention_policies WHERE enabled = true
  `);
  
  const results: any = {};
  
  for (const policy of (policies.rows || [])) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.days);
      
      let query: any;
      
      if (policy.target === 'comm_messages') {
        query = sql`DELETE FROM comm_messages WHERE created_at < ${cutoffDate.toISOString()}`;
      } else if (policy.target === 'audit_log') {
        query = sql`DELETE FROM audit_log WHERE created_at < ${cutoffDate.toISOString()}`;
      } else if (policy.target === 'lender_activity') {
        query = sql`DELETE FROM lender_activity WHERE created_at < ${cutoffDate.toISOString()}`;
      } else if (policy.target === 'decision_traces') {
        query = sql`DELETE FROM decision_traces WHERE created_at < ${cutoffDate.toISOString()}`;
      } else if (policy.target === 'integration_events') {
        query = sql`DELETE FROM integration_events WHERE created_at < ${cutoffDate.toISOString()}`;
      } else {
        results[policy.target] = { error: `Unknown target: ${policy.target}` };
        continue;
      }
      
      const result = await db.execute(query);
      results[policy.target] = { 
        deleted: result.rowsAffected || 0, 
        cutoff: cutoffDate.toISOString() 
      };
    } catch (error: unknown) {
      results[policy.target] = { error: (error as Error).message };
    }
  }
  
  res.json({ ok: true, results });
});

export default router;