import { Router } from "express";
import { db } from "../db/drizzle";
import { sql, eq, desc } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const r = Router();
r.use(requireAuth);

// Initialize S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ca-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

// List versions of a document group
r.get("/:id/versions", async (req: any, res: any) => {
  try {
    const result = await db.execute(sql`
      SELECT * FROM documents WHERE id = ${req.params.id} LIMIT 1
    `);
    const base = (result.rows || result)[0];
    
    if (!base) return res.status(404).json({ ok: false });
    
    const versions = await db.execute(sql`
      SELECT * FROM documents 
      WHERE group_id = ${(base as any).group_id}
      ORDER BY version DESC
    `);
    
    res.json({ ok: true, items: versions.rows || versions });
  } catch (error: unknown) {
    console.error("[DOCUMENT VERSIONS] Error:", error);
    res.status(500).json({ ok: false, error: "Failed to get versions" });
  }
});

// Replace/re-upload document with versioning
r.post("/:id/replace", async (req: any, res: any) => {
  try {
    const result = await db.execute(sql`
      SELECT * FROM documents WHERE id = ${req.params.id} LIMIT 1
    `);
    const old = (result.rows || result)[0];
    
    if (!old) return res.status(404).json({ ok: false });

    // Get next version number in group
    const versionResult = await db.execute(sql`
      SELECT COALESCE(MAX(version), 1) as max 
      FROM documents 
      WHERE group_id = ${(old as any).group_id}
    `);
    const nextVer = Number((versionResult.rows || versionResult)[0]?.max) + 1;

    // For now, return success without actual file handling
    // TODO: Implement actual file upload with multer or similar
    const newDoc = {
      applicationId: (old as any).applicationId,
      category: (old as any).category,
      name: (old as any).name,
      s3_key: `${(old as any).s3_key}.v${nextVer}`,
      content_type: 'application/pdf',
      size_bytes: 0,
      version: nextVer,
      status: 'pending',
      uploaded_by: (req as any).user?.sub || 'staff',
      group_id: (old as any).group_id
    };

    const insertResult = await db.execute(sql`
      INSERT INTO documents (applicationId, category, name, s3_key, content_type, size_bytes, version, status, uploaded_by, group_id)
      VALUES (${newDoc.applicationId}, ${newDoc.category}, ${newDoc.name}, ${newDoc.s3_key}, ${newDoc.content_type}, ${newDoc.size_bytes}, ${newDoc.version}, ${newDoc.status}, ${newDoc.uploaded_by}, ${newDoc.group_id})
      RETURNING *
    `);
    
    const row = (insertResult.rows || insertResult)[0];
    res.json({ ok: true, item: row });
  } catch (error: unknown) {
    console.error("[DOCUMENT REPLACE] Error:", error);
    res.status(500).json({ ok: false, error: "Failed to replace document" });
  }
});

// Get document audit trail
r.get("/:id/audit", async (req: any, res: any) => {
  try {
    const auditResult = await db.execute(sql`
      SELECT * FROM documents 
      WHERE group_id = (SELECT group_id FROM documents WHERE id = ${req.params.id})
      ORDER BY createdAt DESC
    `);
    
    res.json({ ok: true, items: auditResult.rows || auditResult });
  } catch (error: unknown) {
    console.error("[DOCUMENT AUDIT] Error:", error);
    res.status(500).json({ ok: false, error: "Failed to get audit trail" });
  }
});

export default r;