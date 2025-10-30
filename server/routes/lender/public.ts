import { Router } from "express";
import { lenderAuth, lenderAudit } from "../../middleware/lender";
import { db } from "../../db";
import { sql } from "drizzle-orm";

const router = Router();

router.use(lenderAuth);

/* App summary + docs list (names only) */
router.get("/app", async (req:any, res)=>{
  const appId = req.lender.applicationId;
  const app = (await db.execute(sql`SELECT id, product_category, stage, amount_requested FROM applications WHERE id=${appId} LIMIT 1`)).rows?.[0];
  const docs = (await db.execute(sql`SELECT id, filename, category, createdAt FROM documents WHERE applicationId=${appId} ORDER BY createdAt DESC`)).rows || [];
  await lenderAudit(req, "login", {});
  res.json({ application: app, documents: docs });
});

/* Presigned upload (if allowed) */
router.post("/upload", async (req:any, res)=>{
  if (!req.lender.perms.includes("upload_docs")) return res.status(403).json({ error: "forbidden" });
  const { filename, contentType="application/octet-stream", category } = req.body || {};
  const key = `lender/${req.lender.applicationId}/${Date.now()}_${String(filename||'file').replace(/\s+/g,'_')}`;
  
  // For now, return a mock presigned URL - in production this would use AWS Azure
  const mockUrl = `/api/lender/mock-upload?key=${encodeURIComponent(key)}`;
  
  await db.execute(sql`
    INSERT INTO documents(applicationId, filename, s3_key, category, source, partner_id)
    VALUES (${req.lender.applicationId}, ${filename}, ${key}, ${category||null}, 'lender', ${req.lender.partnerId})
  `);
  await lenderAudit(req, "doc_upload", { filename, category });
  res.json({ ok: true, url: mockUrl, key });
});

/* Presigned download (if allowed) */
router.post("/download", async (req:any, res)=>{
  if (!req.lender.perms.includes("download_docs")) return res.status(403).json({ error: "forbidden" });
  const { documentId } = req.body || {};
  const doc = (await db.execute(sql`SELECT id, filename, s3_key FROM documents WHERE id=${documentId} AND applicationId=${req.lender.applicationId} LIMIT 1`)).rows?.[0];
  if (!doc?.s3_key) return res.status(404).json({ error: "not found" });
  
  // For now, return a mock download URL - in production this would use AWS Azure
  const mockUrl = `/api/lender/mock-download?key=${encodeURIComponent(doc.s3_key)}`;
  
  await lenderAudit(req, "doc_download", { documentId, filename: doc.filename });
  res.json({ ok: true, url: mockUrl, filename: doc.filename });
});

/* Messages thread (read/write) */
router.get("/messages", async (req:any, res)=>{
  const appId = req.lender.applicationId;
  const r = await db.execute(sql`SELECT id, body, createdAt, role FROM comm_messages WHERE applicationId=${appId} AND channel='portal' ORDER BY createdAt DESC LIMIT 100`);
  res.json(r.rows || []);
});

router.post("/messages", async (req:any, res)=>{
  if (!req.lender.perms.includes("write_messages")) return res.status(403).json({ error: "forbidden" });
  const appId = req.lender.applicationId;
  await db.execute(sql`
    INSERT INTO comm_messages(applicationId, partner_id, direction, channel, role, body, createdAt)
    VALUES (${appId}, ${req.lender.partnerId}, 'in', 'portal', 'lender', ${String(req.body?.body||"")}, now())
  `);
  await lenderAudit(req, "message", {});
  res.json({ ok: true });
});

export default router;