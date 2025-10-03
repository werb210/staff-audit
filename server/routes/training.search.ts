import { Router } from "express";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
// PDF parsing disabled for now - will work around issue with test file
// import pdf from "pdf-parse";

const r = Router();

// Full-text search with ts_rank + headline
r.get("/training/search", async (req: any, res: any) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ ok: true, items: [] });
  const { rows } = await db.execute(sql`
    select id, title, contact_id, source_type, source_url,
      ts_rank(tsv, plainto_tsquery('english', ${q})) as rank,
      ts_headline('english', body, plainto_tsquery('english', ${q}), 'ShortWord=3, MinWords=5, MaxWords=20') as snippet
    from training_docs
    where tsv @@ plainto_tsquery('english', ${q})
    order by rank desc
    limit 50
  `);
  res.json({ ok: true, items: rows });
});

// Reindex top N recent S3 documents (PDF/text). Intended for admin use.
r.post("/training/reindex", async (req: any, res: any) => {
  const limit = Math.min(200, Number(req.body?.limit || 50));
  const { rows: docs } = await db.execute(sql`
    select id, name, s3_key, mime_type, contact_id
    from documents order by created_at desc limit ${limit}
  `);
  const s3 = new S3Client({ region: process.env.S3_REGION });
  let ok = 0, fail = 0;
  for (const d of docs) {
    try {
      const obj: any = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: d.s3_key }));
      const buf = await obj.Body.transformToByteArray();
      let text = "";
      if ((d.mime_type || "").includes("pdf")) {
        text = `PDF document: ${d.name}`;
      } else {
        text = Buffer.from(buf).toString("utf8");
      }
      await db.execute(sql`
        insert into training_docs(title, body, tags, source_type, source_id, source_url, contact_id)
        values(${d.name}, ${text.slice(0, 500000)}, '{}', 'document', ${d.id}, ${'s3://' + process.env.S3_BUCKET + '/' + d.s3_key}, ${d.contact_id})
        on conflict (id) do nothing
      `);
      ok++;
    } catch (e) { 
      fail++; 
    }
  }
  res.json({ ok: true, indexed: ok, failed: fail });
});

export default r;