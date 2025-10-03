import { Router, Request, Response } from "express";
import { pool } from "../../db";
import { PIPELINE_STAGES, normalizeStage, PipelineStage } from "../../services/pipeline";
import { notifyPipelineUpdate } from "../../websocket";

const r = Router();

async function ensureActivityTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pipeline_activity (
      id             BIGSERIAL PRIMARY KEY,
      application_id VARCHAR(64) NOT NULL,
      from_stage     VARCHAR(64),
      to_stage       VARCHAR(64) NOT NULL,
      actor          VARCHAR(128) DEFAULT 'staff',
      note           TEXT,
      created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

function mapRowToCard(row: any) {
  return {
    id: String(row.id),
    title: row.business_name || row.title || "Untitled Application",
    amount: Number(row.requested_amount || row.loan_amount || 0),
    contact: [row.first_name, row.last_name].filter(Boolean).join(" ") || row.email || row.phone || "—",
    stage: String(row.status || "new").toLowerCase().trim(),
  };
}

// Columns with cards
r.get("/pipeline", async (_req: Request, res: Response) => {
  const { rows } = await pool.query(`
    SELECT a.id, a.stage as status, a.requested_amount, a.business_name,
           u.first_name, u.last_name, u.email, u.phone
    FROM applications a
    LEFT JOIN users u ON u.id::text = a.user_id AND a.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ORDER BY a.updated_at DESC NULLS LAST, a.id DESC
  `);
  const columns = PIPELINE_STAGES.map(c => ({ id: c.id, label: c.label, items: [] as any[] }));
  const byId: Record<PipelineStage, any> = Object.fromEntries(columns.map(c => [c.id, c]));
  for (const row of rows) {
    const st = (byId[row.status as PipelineStage] ? row.status : "new") as PipelineStage;
    byId[st].items.push(mapRowToCard({ ...row, status: st }));
  }
  res.json({ columns });
});

// Move stage
r.post("/pipeline/move", async (req: Request, res: Response) => {
  const { applicationId, toStage, note } = req.body || {};
  if (!applicationId) return res.status(400).json({ error: "missing_applicationId" });
  let target: PipelineStage;
  try { target = normalizeStage(toStage); } catch { return res.status(400).json({ error: "invalid_stage" }); }
  await ensureActivityTable();
  const q = await pool.query(`SELECT id, stage as status FROM applications WHERE id = $1::uuid`, [applicationId]);
  if (!q.rows.length) return res.status(404).json({ error: "application_not_found" });
  const from = String(q.rows[0].status || "new").toLowerCase().trim();
  if (from === target) return res.json({ ok: true, changed: false, stage: target });
  await pool.query(`UPDATE applications SET stage = $1 WHERE id = $2::uuid`, [target, applicationId]);
  await pool.query(
    `INSERT INTO pipeline_activity (application_id, from_stage, to_stage, note) VALUES ($1,$2,$3,$4)`,
    [applicationId, from || null, target, note || null]
  );
  
  // Trigger WebSocket notification for live updates
  try {
    notifyPipelineUpdate();
    console.log(`[WebSocket] Pipeline update broadcast for app ${applicationId}: ${from} → ${target}`);
  } catch (err) {
    console.warn('[WebSocket] Failed to broadcast pipeline update:', err);
  }
  
  res.json({ ok: true, changed: true, stage: target });
});

// KPI counts
r.get("/pipeline/metrics", async (_req: Request, res: Response) => {
  const { rows } = await pool.query(`SELECT LOWER(status) AS stage, COUNT(*)::int AS count FROM applications GROUP BY LOWER(status)`);
  const counts: Record<string, number> = Object.fromEntries(PIPELINE_STAGES.map(s => [s.id, 0]));
  for (const row of rows) if (row.stage && counts.hasOwnProperty(row.stage)) counts[row.stage] = row.count;
  const total = Object.values(counts).reduce((a,b)=>a+b,0);
  res.json({ counts, total });
});

// Activity timeline
r.get("/pipeline/activity", async (req: Request, res: Response) => {
  const id = String(req.query.applicationId || "");
  if (!id) return res.status(400).json({ error: "missing_applicationId" });
  await ensureActivityTable();
  const { rows } = await pool.query(
    `SELECT id, application_id, from_stage, to_stage, actor, note, created_at
       FROM pipeline_activity
      WHERE application_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 100`,
    [id]
  );
  res.json(rows);
});

export default r;