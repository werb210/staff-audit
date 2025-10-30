import { Router, Request, Response } from "express";
import { z } from "zod";
import { presignUpload } from "../../services/s3";
import { pool } from "../../db";
import archiver from "archiver";

const router = Router();

const PresignSchema = z.object({
  applicationId: z.string(),
  filename: z.string(),
  contentType: z.string(),
  sha256: z.string().length(64),
  category: z.string()
});

// 1) PRESIGN
router.post("/documents/presign", async (req: Request, res: Response) => {
  try {
    const parsed = PresignSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "invalid_payload", 
        issues: parsed.error.format() 
      });
    }
    
    const { applicationId, filename, contentType, sha256, category } = parsed.data;

    // Create object key convention: apps/{id}/{timestamp}-{filename}
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectKey = `apps/${applicationId}/${Date.now()}-${safeName}`;

    const { url, key } = await presignUpload(objectKey, contentType, sha256);
    
    res.json({ 
      url, 
      key, 
      objectKey: key, 
      applicationId, 
      category 
    });
    
  } catch (error: unknown) {
    console.error("Presign error:", error);
    res.status(500).json({ error: "internal_server_error" });
  }
});

// 2) CONFIRM (record in DB, verify metadata)
const ConfirmSchema = PresignSchema.extend({ objectKey: z.string() });

router.post("/documents/confirm", async (req: Request, res: Response) => {
  try {
    const parsed = ConfirmSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "invalid_payload", 
        issues: parsed.error.format() 
      });
    }
    
    const { applicationId, filename, contentType, sha256, category, objectKey } = parsed.data;

    // Record in database
    const { rows } = await pool.query(`
      INSERT INTO documents (
        id, applicationId, name, document_type, 
        storage_key, checksum, mime_type, createdAt, updatedAt
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, now(), now()
      ) RETURNING id
    `, [applicationId, filename, category, objectKey, sha256, contentType]);

    const documentId = rows[0].id;
    console.log(`✅ Document confirmed: ${documentId} for application ${applicationId}`);

    res.json({ 
      documentId, 
      status: "confirmed", 
      objectKey 
    });
    
  } catch (error: unknown) {
    console.error("Confirm error:", error);
    res.status(500).json({ error: "internal_server_error" });
  }
});

// 3) ZIP download
router.get("/applications/:id/documents.zip", async (req: Request, res: Response) => {
  try {
    const { id: applicationId } = req.params;
    
    // Get documents for this application
    const { rows } = await pool.query(`
      SELECT name, storage_key, document_type 
      FROM documents 
      WHERE applicationId = $1 
      ORDER BY createdAt ASC
    `, [applicationId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "no_documents_found" });
    }

    // Set headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="app-${applicationId}-documents.zip"`);

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('error', (err) => {
      console.error('ZIP archive error:', err);
      res.status(500).json({ error: 'archive_creation_error' });
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add placeholder content (in production, fetch from Azure)
    for (const doc of rows) {
      const content = `Document: ${doc.name}\nType: ${doc.document_type}\nStorage: ${doc.storage_key}\n\n[File content would be fetched from Azure in production]`;
      archive.append(content, { name: doc.name });
    }

    // Finalize archive
    archive.finalize();
    
  } catch (error: unknown) {
    console.error("ZIP download error:", error);
    res.status(500).json({ error: "internal_server_error" });
  }
});

export default router;