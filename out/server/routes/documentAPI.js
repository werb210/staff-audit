import { Router } from 'express';
import { pool } from '../db';
import { bearerAuth } from '../middleware/bearerAuth';
const router = Router();
// List documents for an application with view URLs
router.get('/applications/:id/documents', bearerAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT id, name, file_key, size, document_type, status, uploaded_at, uploaded_by
      FROM documents 
      WHERE applicationId = $1 
      ORDER BY uploaded_at DESC
    `, [req.params.id]);
        // For now, generate simple view URLs - in production this would be S3 presigned URLs
        const withUrls = rows.map(d => ({
            ...d,
            url: `/api/documents/${d.id}/view`,
            size: Number(d.size) || 0,
            uploaded_at: d.uploaded_at
        }));
        res.json({ ok: true, data: withUrls });
    }
    catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ ok: false, error: 'Failed to fetch documents' });
    }
});
// Upload/link document to application
router.post('/applications/:id/documents', bearerAuth, async (req, res) => {
    try {
        const appId = req.params.id;
        const { fileName, fileKey, fileSize, documentType } = req.body;
        if (!fileName || !fileKey) {
            return res.status(400).json({ ok: false, error: 'fileName and fileKey required' });
        }
        await pool.query(`
      INSERT INTO documents (applicationId, name, file_key, size, document_type, status, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6)
    `, [appId, fileName, fileKey, fileSize || null, documentType || null, req.user?.email || 'system']);
        res.json({ ok: true });
    }
    catch (error) {
        console.error('Error linking document:', error);
        res.status(500).json({ ok: false, error: 'Failed to link document' });
    }
});
// View document (would be S3 redirect in production)
router.get('/documents/:docId/view', bearerAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT name, file_key, document_type 
      FROM documents 
      WHERE id = $1
    `, [req.params.docId]);
        if (!rows[0]) {
            return res.status(404).json({ ok: false, error: 'Document not found' });
        }
        // In production, this would redirect to S3 presigned URL
        res.json({
            ok: true,
            message: 'Document view requested',
            name: rows[0].name,
            document_type: rows[0].document_type
        });
    }
    catch (error) {
        console.error('Error viewing document:', error);
        res.status(500).json({ ok: false, error: 'Failed to view document' });
    }
});
// Accept/Reject document status
router.put('/documents/:docId/status', bearerAuth, async (req, res) => {
    try {
        const { status, reason } = req.body;
        if (!['verified', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ ok: false, error: 'Invalid status. Must be: verified, rejected, or pending' });
        }
        await pool.query(`
      UPDATE documents 
      SET status = $1, updatedAt = NOW()
      WHERE id = $2
    `, [status, req.params.docId]);
        res.json({ ok: true });
    }
    catch (error) {
        console.error('Error updating document status:', error);
        res.status(500).json({ ok: false, error: 'Failed to update document status' });
    }
});
export default router;
