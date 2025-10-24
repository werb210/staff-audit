import type { Express, Request, Response, Router as ExpressRouter } from "express";
import { z } from "zod";
import express from "express";
import jwt from "jsonwebtoken";
import { db } from "../db.js";
import { sql } from "drizzle-orm";

// Optional AWS (prod)
let S3Client, PutObjectCommand, getSignedUrl;
try {
  ({ S3Client } = await import("@aws-sdk/client-s3"));
  ({ PutObjectCommand } = await import("@aws-sdk/client-s3"));
  ({ getSignedUrl } = await import("@aws-sdk/s3-request-presigner"));
} catch (_) { /* dev mode without AWS */ }

const PresignBody = z.object({
  applicationId: z.string().min(8),
  filename: z.string().min(1),
  contentType: z.string().min(3),
  size: z.number().optional(),
  // optional tenant/silo if you pass it along
  tenant: z.string().optional()
});

const CompleteBody = z.object({
  token: z.string().min(1),
  sha256: z.string().optional(),
  pages: z.number().optional()
});

const isProd = process.env.NODE_ENV === "production";
const USE_AWS = !!(process.env.S3_BUCKET && process.env.AWS_REGION);
const DOCS_JWT_SECRET = process.env.JWT_SECRET || process.env.DOCS_JWT_SECRET || "dev-docs-secret";

type MountTarget = Express | ExpressRouter;

function joinPaths(basePath: string, routePath: string) {
  const base = basePath.replace(/\/+$/, "");
  const route = routePath.replace(/^\/+/, "");

  if (!base && !route) {
    return "/";
  }

  if (!base) {
    return `/${route}`;
  }

  if (!route) {
    return base || "/";
  }

  return `${base}/${route}`;
}

export function mountDocumentRoutes(app: MountTarget, basePath = "/api") {
  const pathFor = (suffix: string) => joinPaths(basePath, suffix);

  // POST /api/documents/presign
  app.post(pathFor("/documents/presign"), async (req: Request, res: Response) => {
    const parsed = PresignBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "INVALID_BODY", details: parsed.error.flatten() });
    }
    const { applicationId, filename, contentType, size } = parsed.data;

    // key convention
    const safeName = filename.replace(/[^\w.\-]+/g, "_");
    const key = `apps/${applicationId}/uploads/${Date.now()}_${safeName}`;

    // Generate confirm token for later document registration
    const confirmToken = jwt.sign(
      { applicationId, key, contentType, size: size || 0, filename },
      DOCS_JWT_SECRET,
      { expiresIn: "15m" }
    );

    if (isProd && USE_AWS) {
      try {
        const s3 = new S3Client({ region: process.env.AWS_REGION });
        const bucket = process.env.S3_BUCKET!;
        const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
        const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 }); // 5 min

        return res.json({
          ok: true,
          storage: "s3",
          bucket,
          key,
          url,
          method: "PUT",
          headers: { "Content-Type": contentType },
          confirmToken
        });
      } catch (e: any) {
        return res.status(500).json({ ok: false, error: "S3_SIGN_ERROR", message: e?.message });
      }
    }

    // DEV / STAGING fallback: local disk upload
    // PUT the file to this URL; we'll save it to /tmp/storage under the same key
    const baseUrl = "http://localhost:5000";  // For audit compatibility
    const uploadPath = joinPaths(req.baseUrl || "", `/dev/mock-upload/${encodeURIComponent(key)}`);
    return res.json({
      ok: true,
      storage: "local",
      key,
      url: `${baseUrl}${uploadPath}`,
      method: "PUT",
      headers: { "Content-Type": contentType },
      confirmToken
    });
  });

  // DEV upload sink (no auth), writes raw body to /tmp/storage/<key>
  if (!isProd) {
    import("fs/promises").then(({ mkdir, writeFile }) => {
      app.put(pathFor("/dev/mock-upload/:key"), express.raw({ type: "*/*", limit: "25mb" }), async (req: any, res: any) => {
        try {
          const key = decodeURIComponent(req.params.key);
          const fullPath = `/tmp/storage/${key}`;
          await mkdir(fullPath.substring(0, fullPath.lastIndexOf("/")), { recursive: true });
          await writeFile(fullPath, req.body);
          res.status(200).json({ ok: true, stored: fullPath, size: req.body?.length || 0 });
        } catch (e: any) {
          res.status(500).json({ ok: false, error: "DEV_STORE_ERROR", message: e?.message });
        }
      });
    });
  }

  // POST /api/documents/complete - Register document in database after successful upload
  app.post(pathFor("/documents/complete"), async (req: Request, res: Response) => {
    const parsed = CompleteBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "INVALID_BODY", details: parsed.error.flatten() });
    }

    const { token, sha256, pages } = parsed.data;
    
    // Verify JWT token
    let payload: any;
    try {
      payload = jwt.verify(token, DOCS_JWT_SECRET) as {
        applicationId: string;
        key: string;
        contentType: string;
        size: number;
        filename: string;
      };
    } catch {
      return res.status(400).json({ ok: false, error: "BAD_TOKEN" });
    }

    const { applicationId, key, contentType, size, filename } = payload;

    try {
      // Insert document record into database using SQL template literal
      await db.execute(sql`
        INSERT INTO documents (
          application_id, storage_key, object_storage_key, mime_type, file_size, 
          sha256, file_name, status, document_type, created_at
        ) VALUES (
          ${applicationId}, ${key}, ${key}, ${contentType}, ${size}, 
          ${sha256 || null}, ${filename}, 'pending', 'bank_statement', NOW()
        ) ON CONFLICT (storage_key) DO NOTHING
      `);

      console.log(`📝 [DOC-COMPLETE] Registered document: ${filename} for application: ${applicationId}`);

      return res.json({ ok: true, applicationId, key });
    } catch (error: any) {
      console.error("❌ [DOC-COMPLETE] Database error:", error);
      return res.status(500).json({ ok: false, error: "DATABASE_ERROR", message: error instanceof Error ? error.message : String(error) });
    }
  });

  // GET /api/documents/list?applicationId=UUID  (lists stored objects quickly)
  app.get(pathFor("/documents/list"), async (req: Request, res: Response) => {
    const applicationId = `${req.query.applicationId || ""}`;
    if (!applicationId) return res.status(400).json({ ok: false, error: "MISSING_APPLICATION_ID" });

    if (isProd && USE_AWS) {
      try {
        const s3 = new S3Client({ region: process.env.AWS_REGION });
        const bucket = process.env.S3_BUCKET!;
        // Light-weight prefix listing; you can swap to ListObjectsV2Command if you prefer
        const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
        const out = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `apps/${applicationId}/uploads/` }));
        const items = (out.Contents || []).map(o => ({ key: o.Key, size: o.Size, lastModified: o.LastModified }));
        return res.json({ ok: true, storage: "s3", items });
      } catch (e: any) {
        return res.status(500).json({ ok: false, error: "S3_LIST_ERROR", message: e?.message });
      }
    }

    // DEV: read local directory
    try {
      const base = `/tmp/storage/apps/${applicationId}/uploads`;
      const { readdir, stat } = await import("fs/promises");
      let items: any[] = [];
      try {
        const files = await readdir(base);
        for (const f of files) {
          const s = await stat(`${base}/${f}`);
          items.push({ key: `apps/${applicationId}/uploads/${f}`, size: s.size, lastModified: s.mtime });
        }
      } catch {
        items = [];
      }
      return res.json({ ok: true, storage: "local", items });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: "DEV_LIST_ERROR", message: e?.message });
    }
  });
}