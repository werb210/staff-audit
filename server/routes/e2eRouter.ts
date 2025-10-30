import express from "express";
import multer from "multer";
import crypto from "crypto";
import { Pool } from "pg";
import { S3Client, HeadBucketCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, presignDownload } from "../lib/s3";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });
const r = express.Router();

// Database helper for E2E tests
let pool: Pool | null = null;
function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  }
  return pool;
}
async function q<T=any>(text: string, params: any[] = []) {
  const res = await getPool().query(text, params);
  return res.rows as unknown as T[];
}

// S3 helper functions
const BUCKET = process.env.S3_BUCKET!;

async function s3Health() {
  await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  return { ok: true, bucket: BUCKET };
}

async function s3Put(key: string, body: Buffer, contentType: string) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: body, ContentType: contentType, ServerSideEncryption: "AES256"
  }));
  return { key };
}

async function s3Presign(key: string, op: "getObject" | "download" = "getObject") {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const cmd = new GetObjectCommand({ 
    Bucket: BUCKET, 
    Key: key, 
    ResponseContentDisposition: op === "download" ? "attachment" : undefined 
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 10 });
  return { url, key };
}

function gate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const tok = req.header("x-test-token");
  if (!process.env.E2E_TEST_TOKEN) return res.status(500).json({ error: "E2E_TEST_TOKEN not set" });
  if (tok !== process.env.E2E_TEST_TOKEN) return res.status(401).json({ error: "unauthorized e2e surface" });
  next();
}
r.use(gate);

// S3 connectivity
r.get("/s3/test-connection", async (_req, res, next) => {
  try { res.json(await s3Health()); } catch (e) { next(e); }
});

// Create application (minimal)
r.post("/applications", async (req: any, res: any, next: any) => {
  try {
    const a = req.body || {};
    const id = crypto.randomUUID();
    const now = new Date();
    await q(
      `insert into applications (id, user_id, status, requested_amount, use_of_funds, createdAt, updatedAt)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [id, "test-user", "draft", a.amountRequested || 250000, a.useOfFunds || "Working capital", now, now]
    );
    res.status(201).json({ id });
  } catch (e) { next(e); }
});

// Get application (with documents)
r.get("/applications/:id", async (req: any, res: any, next: any) => {
  try {
    const [app] = await q<any>(`select * from applications where id=$1`, [req.params.id]);
    if (!app) return res.status(404).json({ error: "not_found" });
    const docs = await q<any>(`select id, applicationId, document_type as category, file_type as mime_type, size as size_bytes, file_path as s3_key, status from documents where applicationId=$1 order by createdAt asc`, [req.params.id]);
    res.json({ ...app, documents: docs });
  } catch (e) { next(e); }
});

// Upload document (multipart -> S3 -> DB)
r.post("/applications/:id/documents", upload.single("file"), async (req: any, res: any, next: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file required" });
    const category = String(req.body.category || "other");
    const id = crypto.randomUUID();
    const key = `applications/${req.params.id}/${id}-${req.file.originalname}`;
    await s3Put(key, req.file.buffer, req.file.mimetype || "application/octet-stream");
    await q(
      `insert into documents (id, applicationId, name, file_type, size, document_type, file_path)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [id, req.params.id, req.file.originalname, req.file.mimetype || "application/pdf", req.file.size, category.toLowerCase(), key]
    );
    res.status(201).json({ id, s3Key: key, status: "pending" });
  } catch (e) { next(e); }
});

// Accept document (staff analogue for e2e)
r.patch("/documents/:id/accept", async (req: any, res: any, next: any) => {
  try {
    const [doc] = await q<any>(`update documents set status='accepted', updatedAt=now(), verified_at=now() where id=$1 returning id, applicationId`, [req.params.id]);
    if (!doc) return res.status(404).json({ error: "not_found" });
    // Rule: if all required docs are accepted, bump stage (lightweight)
    const pending = await q<any>(`select 1 from documents where applicationId=$1 and status <> 'accepted' limit 1`, [doc.applicationId]);
    if (pending.length === 0) {
      await q(`update applications set status='under_review' where id=$1`, [doc.applicationId]);
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Presign viewer
r.get("/documents/:id/presign", async (req: any, res: any, next: any) => {
  try {
    const [doc] = await q<any>(`select file_path as s3_key, file_type as mime_type from documents where id=$1`, [req.params.id]);
    if (!doc) return res.status(404).json({ error: "not_found" });
    const op = (req.query.op === "download" ? "download" : "getObject") as any;
    const ps = await s3Presign(doc.s3_key, op);
    res.json({ ...ps, contentType: doc.mime_type });
  } catch (e) { next(e); }
});

// ZIP (optional stub if not implemented)
r.get("/applications/:id/documents/zip", async (_req, res) => {
  res.status(501).json({ error: "zip_not_implemented" });
});

export default r;