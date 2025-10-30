import { Router, Request, Response } from "express";
import archiver from "archiver";
import { pool } from "../../db";

const r = Router();

// Always returns 200 with a valid ZIP (possibly empty) + manifest
r.get("/applications/:id/documents.zip", async (req: Request, res: Response) => {
  const appId = String(req.params.id);
  const { rows } = await pool.query(
    `SELECT id, name as filename, storage_key as object_key, file_type as content_type, sha256, status
       FROM documents
      WHERE applicationId = $1
        AND status IN ('pending','accepted')
      ORDER BY createdAt ASC, id ASC`,
    [appId]
  );

  res.status(200);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="application_${appId}_documents.zip"`);

  const zip = archiver("zip", { zlib: { level: 9 } });
  zip.on("error", () => { try { res.status(500).end(); } catch(_){} });
  zip.pipe(res);

  const manifest: string[] = [
    "# Application documents manifest",
    `applicationId=${appId}`,
    `generatedAt=${new Date().toISOString()}`,
    ""
  ];

  if (!rows.length) {
    manifest.push("no_documents=true");
    zip.append(manifest.join("\n") + "\n", { name: "manifest.txt" });
    zip.append("No documents were found at export time.\n", { name: "README.txt" });
    await zip.finalize();
    return;
  }

  for (const d of rows) {
    manifest.push(`file=${d.filename}`);
    manifest.push(`key=${d.object_key}`);
    manifest.push(`status=${d.status}`);
    if (d.sha256) manifest.push(`sha256=${d.sha256}`);
    manifest.push("");
    zip.append(`s3://${process.env.Azure_BUCKET}/${d.object_key}\n`, { name: `pointers/${d.id}_${d.filename}.txt` });
  }
  zip.append(manifest.join("\n") + "\n", { name: "manifest.txt" });
  await zip.finalize();
});

export default r;