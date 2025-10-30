import { Router } from "express";
const q = pool.query.bind(pool);
import { pool } from "../../db/pool";
import { getContactMergeVars, mergeVars } from "../../services/mergeFields";
import { renderLiquid } from "../../services/templateEngine";

const router = Router();

// Get all templates
router.get("/", async (req: any, res: any) => {
  try {
    const { channel } = req.query;
    
    let query = `
      SELECT * FROM comm_templates 
      WHERE is_active = true
    `;
    const params: any[] = [];
    
    if (channel) {
      query += ` AND channel = $1`;
      params.push(channel);
    }
    
    query += ` ORDER BY name ASC`;
    
    const templates = await q<any>(query, params);
    return res.json({ templates });
  } catch (error: unknown) {
    console.error('Templates fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Create new template
router.post("/", async (req: any, res: any) => {
  const { name, channel, subject, body } = req.body || {};
  if (!name || !channel || !body) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const [template] = await q<{ id: string }>(`
      INSERT INTO comm_templates (name, channel, subject, body)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [name, channel, subject, body]);

    return res.json({ ok: true, id: template.id });
  } catch (error: unknown) {
    console.error('Template creation error:', error);
    return res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.patch("/:id", async (req: any, res: any) => {
  const { id } = req.params;
  const { name, subject, body, isActive } = req.body || {};

  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (subject !== undefined) {
      fields.push(`subject = $${paramIndex++}`);
      values.push(subject);
    }
    if (body !== undefined) {
      fields.push(`body = $${paramIndex++}`);
      values.push(body);
    }
    if (isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    fields.push(`updatedAt = NOW()`);
    values.push(id);

    await q(`
      UPDATE comm_templates 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
    `, values);

    return res.json({ ok: true });
  } catch (error: unknown) {
    console.error('Template update error:', error);
    return res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template (soft delete)
router.delete("/:id", async (req: any, res: any) => {
  const { id } = req.params;

  try {
    await q(`
      UPDATE comm_templates 
      SET is_active = false, updatedAt = NOW()
      WHERE id = $1
    `, [id]);

    return res.json({ ok: true });
  } catch (error: unknown) {
    console.error('Template deletion error:', error);
    return res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Render template with merge fields (locale-aware with versioning)
router.post("/render", async (req: any, res: any) => {
  const { templateId, contactId, vars, locale: reqLocale } = req.body || {};
  if (!templateId) return res.status(400).json({ error: "Missing templateId" });
  
  try {
    const [tpl] = await q<any>(`
      SELECT * FROM comm_templates WHERE id = $1 AND is_active = true LIMIT 1
    `, [templateId]);
    
    if (!tpl) return res.status(404).json({ error: "Template not found" });

    const locale = (reqLocale || process.env.DEFAULT_LOCALE || "en").toLowerCase();

    // 1) try approved version for that locale
    let [version] = await q<any>(`
      SELECT * FROM comm_template_versions
      WHERE template_id=$1 AND locale=$2 AND status='approved'
      ORDER BY version DESC LIMIT 1
    `, [templateId, locale]);

    // 2) fallback to default locale approved
    if (!version) {
      const def = (process.env.DEFAULT_LOCALE || "en").toLowerCase();
      [version] = await q<any>(`
        SELECT * FROM comm_template_versions
        WHERE template_id=$1 AND locale=$2 AND status='approved'
        ORDER BY version DESC LIMIT 1
      `, [templateId, def]);
    }

    // 3) fallback to most recent any status
    if (!version) {
      [version] = await q<any>(`
        SELECT * FROM comm_template_versions
        WHERE template_id=$1
        ORDER BY approved_at DESC NULLS LAST, version DESC
        LIMIT 1
      `, [templateId]);
    }

    // 4) fallback to legacy template if no versions exist
    if (!version) {
      version = { subject: tpl.subject, body: tpl.body };
    }

    const base = contactId ? await getContactMergeVars(contactId, { execute: q }) : {};
    const context = mergeVars(vars, base);

    const subject = version.subject ? await renderLiquid(version.subject, context) : undefined;
    const body = await renderLiquid(version.body, context);

    res.json({ channel: tpl.channel, subject, body, versionId: version.id || null, locale });
  } catch (error: unknown) {
    console.error('Template render error:', error);
    res.status(500).json({ error: 'Failed to render template' });
  }
});

export default router;