import { Router } from "express";
const q = pool.query.bind(pool);
import { pool } from "../../db/pool";
import { z } from "zod";

const router = Router();

router.get("/", async (req: any, res: any) => {
  const templates = await q(`
    SELECT t.id, t.name, t.channel, t.engine, t.default_locale, t.folder, t.tags
    FROM comm_templates t
    ORDER BY t.name
    LIMIT 500
  `);
  res.json(templates);
});

router.get("/:templateId/versions", async (req: any, res: any) => {
  const { templateId } = req.params;
  const versions = await q(`
    SELECT id, version, locale, status, subject, body, changelog, created_at, approved_at
    FROM comm_template_versions
    WHERE template_id = $1
    ORDER BY locale, version DESC
  `, [templateId]);
  res.json(versions);
});

router.post("/:templateId/versions", async (req: any, res: any) => {
  const { templateId } = req.params;
  const schema = z.object({
    locale: z.string().default("en"),
    subject: z.string().optional(),
    body: z.string().min(1),
    changelog: z.string().optional()
  });
  const v = schema.parse(req.body || {});
  
  const nextVerResult = await q(`
    SELECT COALESCE(MAX(version),0)+1 AS v FROM comm_template_versions WHERE template_id = $1 AND locale = $2
  `, [templateId, v.locale]);
  const version = nextVerResult[0]?.v || 1;
  
  const [newVersion] = await q(`
    INSERT INTO comm_template_versions(template_id, version, locale, subject, body, status, changelog, created_by_user_id)
    VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7)
    RETURNING id, version, locale, status
  `, [templateId, version, v.locale, v.subject || null, v.body, v.changelog || null, req.user?.id || null]);
  
  res.json(newVersion);
});

router.post("/:templateId/versions/:versionId/submit", async (req: any, res: any) => {
  const { versionId } = req.params;
  await q(`UPDATE comm_template_versions SET status='pending' WHERE id = $1 AND status='draft'`, [versionId]);
  res.json({ ok: true });
});

router.post("/:templateId/versions/:versionId/approve", async (req: any, res: any) => {
  const { versionId } = req.params;
  await q(`
    UPDATE comm_template_versions
       SET status='approved', approved_at=now(), approved_by_user_id = $1
     WHERE id = $2 AND status='pending'
  `, [req.user?.id || null, versionId]);
  res.json({ ok: true });
});

router.post("/:templateId/versions/:versionId/reject", async (req: any, res: any) => {
  const { versionId } = req.params;
  const reason = String(req.body?.reason || "");
  await q(`
    UPDATE comm_template_versions
       SET status='draft', changelog = COALESCE(changelog,'') || E'\nReject: ' || $1
     WHERE id = $2 AND status='pending'
  `, [reason, versionId]);
  res.json({ ok: true });
});

export default router;