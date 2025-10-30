import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { presignPut } from "../../services/uploads/presign";
// REMOVED: requirePermission from authz service (authentication system deleted)
const router = Router();
/* List requests for an application */
router.get("/:applicationId", async (req, res) => {
    const appId = String(req.params.applicationId);
    const r = await db.execute(sql `SELECT * FROM doc_requests WHERE applicationId=${appId} ORDER BY createdAt ASC`);
    res.json(r.rows || []);
});
/* Quick add one or many requests */
router.post("/create", async (req, res) => {
    const { applicationId, items } = req.body || {}; // items: [{title, description, required, due_date}]
    const rows = [];
    for (const it of (items || [])) {
        const ins = await db.execute(sql `
      INSERT INTO doc_requests(applicationId, title, description, required, due_date, created_by_user_id)
      VALUES (${applicationId}, ${it.title}, ${it.description || null}, ${it.required ?? true}, ${it.due_date || null}, ${req.user?.id || null})
      RETURNING *
    `);
        rows.push(ins.rows?.[0]);
    }
    res.json(rows);
});
/* Approve / Reject / Waive */
router.post("/:requestId/status", async (req, res) => {
    const { status, reason } = req.body || {};
    const allowed = ["approved", "rejected", "waived", "pending", "submitted"];
    if (!allowed.includes(status))
        return res.status(400).json({ error: "bad status" });
    await db.execute(sql `UPDATE doc_requests SET status=${status}, updatedAt=now() WHERE id=${req.params.requestId}`);
    if (status === "rejected" && reason) {
        // optional: store reason in description suffix
        await db.execute(sql `UPDATE doc_requests SET description=coalesce(description,'') || E'\n[Rejection] ' || ${reason} WHERE id=${req.params.requestId}`);
    }
    res.json({ ok: true });
});
/* View uploads for a request */
router.get("/uploads/:requestId", async (req, res) => {
    const r = await db.execute(sql `SELECT * FROM doc_request_uploads WHERE request_id=${req.params.requestId} ORDER BY createdAt DESC`);
    res.json(r.rows || []);
});
/* (Optional) Staff presign to upload on behalf of client */
router.post("/uploads/presign", async (req, res) => {
    const { applicationId, requestId, filename, contentType = "application/octet-stream" } = req.body || {};
    const key = `requests/${applicationId}/${requestId}/${Date.now()}_${String(filename || 'file').replace(/\s+/g, '_')}`;
    const ps = await presignPut({ key, contentType });
    res.json(ps);
});
/* Finalize (turn presigned object into a document & link it) */
router.post("/uploads/finalize", async (req, res) => {
    const { applicationId, requestId, filename, s3_key, contentType } = req.body || {};
    // create or link a document row
    const insDoc = await db.execute(sql `
    INSERT INTO documents(applicationId, filename, s3_key, category, source)
    VALUES (${applicationId}, ${filename}, ${s3_key}, 'request', 'staff')
    RETURNING id
  `);
    const docId = insDoc.rows?.[0]?.id;
    await db.execute(sql `
    INSERT INTO doc_request_uploads(request_id, document_id, filename, s3_key, content_type, uploaded_by)
    VALUES (${requestId}, ${docId}, ${filename}, ${s3_key}, ${contentType || null}, 'staff')
  `);
    // move request to submitted if still pending
    await db.execute(sql `UPDATE doc_requests SET status=CASE WHEN status='pending' THEN 'submitted' ELSE status END, updatedAt=now() WHERE id=${requestId}`);
    res.json({ ok: true, document_id: docId });
});
export default router;
