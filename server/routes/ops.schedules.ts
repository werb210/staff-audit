import { Router } from "express";
import { listAndSummarizeBucket } from "../services/s3Audit.js";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";

const r = Router();

// Create/ensure repeatable jobs (daily S3 audit, daily budget alerts, monthly lender reports)
r.post("/ops/schedules/ensure", async (_req, res) => {
  // Simplified without Redis - just acknowledge the endpoint exists
  res.json({ ok: true, message: "Schedule endpoints ready" });
});

r.get("/ops/schedules", async (_req, res) => {
  // Return mock scheduled jobs for now
  const jobs = [
    { name: "s3-audit", pattern: "0 3 * * *", description: "Daily S3 audit at 03:00" },
    { name: "budget-alerts", pattern: "0 8 * * *", description: "Daily budget alerts at 08:00" },
    { name: "lender-monthly", pattern: "0 9 1 * *", description: "Monthly lender reports on 1st at 09:00" },
    { name: "db-backup", pattern: "0 2 * * *", description: "Daily database backup at 02:00" },
    { name: "training-reindex", pattern: "0 4 * * *", description: "Daily training reindex at 04:00" },
    { name: "client-error-digest", pattern: "0 7 * * *", description: "Daily client error digest at 07:00" }
  ];
  res.json({ ok: true, jobs });
});

// Manual S3 audit trigger for testing
r.post("/ops/s3-audit/run", async (_req, res) => {
  try {
    const s = await listAndSummarizeBucket();
    await db.execute(sql`insert into s3_audit_logs(total_objects, total_size_bytes, sample_keys, mismatches)
      values(${s.total}, ${s.bytes}, ${s.sample}, ${JSON.stringify(s.mismatches || [])}::jsonb)`);
    res.json({ ok: true, audit: s });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "S3 audit failed" });
  }
});

// Manual backup trigger for testing  
r.post("/ops/backup/trigger", async (_req, res) => {
  try {
    const baseUrl = process.env.INTERNAL_BASE_URL || "http://localhost:5000";
    const response = await fetch(`${baseUrl}/api/ops/backup/run`, { 
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();
    res.json({ ok: true, backup: result });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Backup trigger failed", details: String(error) });
  }
});

// Manual budget alerts trigger for testing
r.post("/ops/budget-alerts/trigger", async (_req, res) => {
  try {
    const baseUrl = process.env.INTERNAL_BASE_URL || "http://localhost:5000";
    const fr = await (await fetch(`${baseUrl}/api/marketing/budget/forecast`)).json();
    
    let alertsSent = 0;
    for (const row of fr.rows || []) {
      const pct = (row.projected_cents / row.budget_cents) * 100;
      if (pct >= row.alert_pct) {
        const msg = `Budget alert: ${row.source}\nSpent: $${(row.spent_cents/100).toFixed(2)}\nProjected: $${(row.projected_cents/100).toFixed(2)} of $${(row.budget_cents/100).toFixed(2)} (${Math.round(pct)}%)`;
        
        // Email recipients
        for (const em of row.emails || []) {
          await fetch(`${baseUrl}/api/inbox/send`, { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ 
              channel: "email", 
              to: em, 
              subject: "Budget alert", 
              body: msg 
            }) 
          });
          alertsSent++;
        }
        
        // SMS recipients
        for (const ph of row.phones || []) {
          await fetch(`${baseUrl}/api/sms/send`, { 
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify({ to: ph, body: msg }) 
          }).catch(() => {});
          alertsSent++;
        }
      }
    }
    
    res.json({ ok: true, alerts_sent: alertsSent, forecast: fr });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Budget alerts trigger failed", details: String(error) });
  }
});

export default r;