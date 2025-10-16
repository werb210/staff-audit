import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
// REMOVED: requirePermission from authz service (authentication system deleted)

const router = Router();

/* List template sets */
router.get("/sets", async (req: any, res) => {
  const sets = await db.execute(sql`
    SELECT s.*, COUNT(v.id) as version_count,
           COUNT(CASE WHEN v.status='published' THEN 1 END) as published_count
    FROM comm_template_sets s
    LEFT JOIN comm_template_versions v ON v.set_id = s.id
    GROUP BY s.id, s.set_key, s.description, s.created_at
    ORDER BY s.created_at DESC
  `);
  res.json(sets.rows || []);
});

/* Create template set */
router.post("/sets", async (req: any, res) => {
  const { set_key, description } = req.body || {};
  const result = await db.execute(sql`
    INSERT INTO comm_template_sets (set_key, description)
    VALUES (${set_key}, ${description})
    RETURNING *
  `);
  res.json(result.rows?.[0]);
});

/* List template versions for a set */
router.get("/sets/:setId/versions", async (req: any, res) => {
  const { setId } = req.params;
  const versions = await db.execute(sql`
    SELECT v.*, u.email as created_by_email, a.email as approved_by_email
    FROM comm_template_versions v
    LEFT JOIN users u ON u.id = v.created_by_user_id
    LEFT JOIN users a ON a.id = v.approved_by_user_id
    WHERE v.set_id = ${setId}
    ORDER BY v.created_at DESC
  `);
  res.json(versions.rows || []);
});

/* Create template version */
router.post("/sets/:setId/versions", async (req: any, res) => {
  const { setId } = req.params;
  const { name, channel, subject, body, placeholders } = req.body || {};
  
  const result = await db.execute(sql`
    INSERT INTO comm_template_versions (set_id, name, channel, subject, body, placeholders, created_by_user_id)
    VALUES (${setId}, ${name}, ${channel}, ${subject}, ${body}, ${JSON.stringify(placeholders || [])}, ${req.user?.id})
    RETURNING *
  `);
  res.json(result.rows?.[0]);
});

/* Submit for approval */
router.post("/versions/:versionId/submit", async (req: any, res) => {
  const { versionId } = req.params;
  
  await db.execute(sql`
    UPDATE comm_template_versions 
    SET status = 'pending'
    WHERE id = ${versionId} AND status = 'draft'
  `);
  
  res.json({ ok: true });
});

/* Approve template */
router.post("/versions/:versionId/approve", async (req: any, res) => {
  const { versionId } = req.params;
  const { reason } = req.body || {};
  
  // Update status to approved
  await db.execute(sql`
    UPDATE comm_template_versions 
    SET status = 'approved', approved_by_user_id = ${req.user?.id}, approved_at = now()
    WHERE id = ${versionId} AND status = 'pending'
  `);
  
  // Add approval record
  await db.execute(sql`
    INSERT INTO comm_template_approvals (version_id, approver_user_id, status, reason)
    VALUES (${versionId}, ${req.user?.id}, 'approved', ${reason})
  `);
  
  res.json({ ok: true });
});

/* Reject template */
router.post("/versions/:versionId/reject", async (req: any, res) => {
  const { versionId } = req.params;
  const { reason } = req.body || {};
  
  // Update status back to draft
  await db.execute(sql`
    UPDATE comm_template_versions 
    SET status = 'draft'
    WHERE id = ${versionId} AND status = 'pending'
  `);
  
  // Add rejection record
  await db.execute(sql`
    INSERT INTO comm_template_approvals (version_id, approver_user_id, status, reason)
    VALUES (${versionId}, ${req.user?.id}, 'rejected', ${reason})
  `);
  
  res.json({ ok: true });
});

/* Publish template */
router.post("/versions/:versionId/publish", async (req: any, res) => {
  const { versionId } = req.params;
  
  // First get the version details
  const version = (await db.execute(sql`
    SELECT set_id, channel FROM comm_template_versions WHERE id = ${versionId}
  `)).rows?.[0];
  
  if (!version) {
    return res.status(404).json({ error: "Version not found" });
  }
  
  // Unpublish any existing published version for the same set+channel
  await db.execute(sql`
    UPDATE comm_template_versions 
    SET status = 'approved'
    WHERE set_id = ${version.set_id} AND channel = ${version.channel} AND status = 'published'
  `);
  
  // Publish this version
  await db.execute(sql`
    UPDATE comm_template_versions 
    SET status = 'published', published_at = now()
    WHERE id = ${versionId} AND status = 'approved'
  `);
  
  res.json({ ok: true });
});

/* Get published template for use */
router.get("/published/:setKey/:channel", async (req: any, res) => {
  const { setKey, channel } = req.params;
  
  const template = (await db.execute(sql`
    SELECT v.* FROM comm_template_versions v
    JOIN comm_template_sets s ON s.id = v.set_id
    WHERE s.set_key = ${setKey} AND v.channel = ${channel} AND v.status = 'published'
    LIMIT 1
  `)).rows?.[0];
  
  if (!template) {
    return res.status(404).json({ error: "No published template found" });
  }
  
  res.json(template);
});

export default router;