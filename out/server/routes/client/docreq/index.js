import { Router } from "express";
import { db } from "../../../db";
import { sql } from "drizzle-orm";
import { presignPut } from "../../../services/uploads/presign";
const router = Router();
/* List tasks for contact (by application(s)) */
router.get("/", async (req, res) => {
    const contactId = req.contact?.id || String(req.query.contactId || "");
    if (!contactId)
        return res.status(401).json({ error: "Unauthorized" });
    const r = await db.execute(sql `
    SELECT r.*, a.id AS applicationId
    FROM applications a
    JOIN doc_requests r ON r.applicationId=a.id
    WHERE a.contact_id=${contactId}
    ORDER BY r.createdAt ASC
  `);
    res.json(r.rows || []);
});
/* Presign upload for a given request */
router.post("/presign", async (req, res) => {
    const contactId = req.contact?.id || String(req.body?.contactId || "");
    const { requestId, filename, contentType = "application/octet-stream" } = req.body || {};
    if (!contactId)
        return res.status(401).json({ error: "Unauthorized" });
    // find app & ensure contact owns it
    const rq = await db.execute(sql `
    SELECT r.id, r.applicationId
    FROM doc_requests r
    JOIN applications a ON a.id=r.applicationId
    WHERE r.id=${requestId} AND a.contact_id=${contactId}
    LIMIT 1
  `);
    const row = rq.rows?.[0];
    if (!row)
        return res.status(404).json({ error: "not found" });
    const key = `requests/${row.applicationId}/${requestId}/${Date.now()}_${String(filename || 'file').replace(/\s+/g, '_')}`;
    const ps = await presignPut({ key, contentType });
    res.json(ps);
});
/* Finalize: create document + link upload; mark submitted if needed */
router.post("/finalize", async (req, res) => {
    const contactId = req.contact?.id || String(req.body?.contactId || "");
    const { requestId, filename, s3_key, contentType } = req.body || {};
    if (!contactId)
        return res.status(401).json({ error: "Unauthorized" });
    const rq = await db.execute(sql `
    SELECT r.id, r.applicationId FROM doc_requests r
    JOIN applications a ON a.id=r.applicationId WHERE r.id=${requestId} AND a.contact_id=${contactId} LIMIT 1
  `);
    const row = rq.rows?.[0];
    if (!row)
        return res.status(404).json({ error: "not found" });
    const insDoc = await db.execute(sql `
    INSERT INTO documents(applicationId, filename, s3_key, category, source)
    VALUES (${row.applicationId}, ${filename}, ${s3_key}, 'request', 'client')
    RETURNING id
  `);
    const docId = insDoc.rows?.[0]?.id;
    await db.execute(sql `
    INSERT INTO doc_request_uploads(request_id, document_id, filename, s3_key, content_type, uploaded_by)
    VALUES (${requestId}, ${docId}, ${filename}, ${s3_key}, ${contentType || null}, 'client')
  `);
    await db.execute(sql `UPDATE doc_requests SET status=CASE WHEN status='pending' THEN 'submitted' ELSE status END, updatedAt=now() WHERE id=${requestId}`);
    res.json({ ok: true, document_id: docId });
});
export default router;
