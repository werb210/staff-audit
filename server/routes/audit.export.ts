import { Router } from "express";
import archiver from "archiver";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly.js";

const r = Router();
r.use(requireAuth);

r.get("/audit/application/:id/export.zip", async (req: any, res: any) => {
  try {
    const appId = req.params.id;
    const app = await db.execute(sql`SELECT * FROM applications WHERE id=${appId} LIMIT 1`);
    if (!app.rows?.[0]) return res.status(404).end();
    
    const docs = await db.execute(sql`
      SELECT id, name, s3_key, mime_type, av_status, created_at, updated_at 
      FROM documents 
      WHERE application_id=${appId} 
      ORDER BY created_at
    `);
    
    const comms = await db.execute(sql`
      SELECT id, kind, direction, body, meta, created_at 
      FROM comms 
      WHERE application_id=${appId} 
      ORDER BY created_at
    `);
    
    const events = await db.execute(sql`
      SELECT * FROM audit_events 
      WHERE application_id=${appId} 
      ORDER BY created_at
    `).catch(() => ({ rows: [] }));

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="audit-${appId}.zip"`);
    
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", err => {
      res.status(500);
      res.end();
    });
    
    archive.pipe(res);
    archive.append(JSON.stringify(app.rows[0], null, 2), { name: "application.json" });
    archive.append(JSON.stringify(docs.rows, null, 2), { name: "documents.json" });
    archive.append(JSON.stringify(comms.rows, null, 2), { name: "communications.json" });
    archive.append(JSON.stringify(events.rows || [], null, 2), { name: "events.json" });
    archive.finalize();
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Export failed" });
  }
});

export default r;