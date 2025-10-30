import { Router } from "express";
import multer from "multer";
import type { Request, Response } from "express";

const r = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ✅ [UPLOAD-HARDENING] Enhanced slug function for security
function slug(s: string) {
  return (s || "file")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "file";
}

// ✅ [PRODUCTION-SECURITY] Import auth middleware for upload protection
const { requireStaff } = await import("../enhanced-auth-middleware.js");

r.post("/api/applications/:id/documents/upload", requireStaff, upload.single("file"), async (req: Request, res: Response) => {
  try {
    const appId = req.params.id;
    const documentType = (req.body.document_type || "").toLowerCase();
    const f = req.file;

    if (!f) return res.status(400).json({ ok: false, error: "NO_FILE" });
    if (!documentType) return res.status(400).json({ ok: false, error: "NO_DOCUMENT_TYPE" });

    // 🔐 optional: ensure user/session is authorized to upload to this application

    // 👉 Server-side persistence (Azure or local). Replace with your existing Azure client.
    // Example using AWS SDK v3 (already configured elsewhere in your app):
    // const key = `applications/${appId}/${Date.now()}-${slug(f.originalname)}`;
    // await s3Client.send(new PutObjectCommand({ Bucket: process.env.Azure_BUCKET!, Key: key, Body: f.buffer, ContentType: f.mimetype }));

    // If you don't want to wire Azure yet, write to disk and set file_key to the path.
    const key = `applications/${appId}/${Date.now()}-${slug(f.originalname)}`;
    // await fs.promises.mkdir(`/data/${appId}`, { recursive: true });
    // await fs.promises.writeFile(`/data/${key}`, f.buffer);

    // 📥 Record in DB
    // Replace with your query helper; this is illustrative:
    const insert = await (req as any).app.locals.db.query(
      `insert into documents (applicationId, name, size, document_type, status, file_key, uploaded_by)
       values ($1,$2,$3,$4,'pending',$5,$6) returning id`,
      [appId, f.originalname, f.size, documentType, key, "staff-ui"]
    );

    return res.json({ ok: true, id: insert.rows[0].id, file_key: key });
  } catch (e: any) {
    console.error("[UPLOAD] Error:", e);
    return res.status(500).json({ ok: false, error: "UPLOAD_FAILED" });
  }
});

// ✅ [PRODUCTION-SECURITY] CRITICAL FIX: Document view route removed from upload router
// This route was bypassing authentication - now handled in main boot.ts with proper security

export default r;