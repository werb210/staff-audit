import { Router } from 'express';
import { backfillChecksums, cleanupOrphanedFiles } from '../utils/checksumBackfill';
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
import * as fs from 'fs';
const router = Router();
/**
 * Backfill missing checksums
 */
router.post('/backfill-checksums', async (req, res) => {
    try {
        const result = await backfillChecksums();
        res.json({
            success: true,
            message: 'Checksum backfill completed',
            ...result
        });
    }
    catch (error) {
        console.error('❌ Checksum backfill failed:', error);
        res.status(500).json({
            success: false,
            error: 'Checksum backfill failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * Get orphaned files report
 */
router.get('/orphaned-files', async (req, res) => {
    try {
        const result = await cleanupOrphanedFiles();
        res.json({
            success: true,
            message: 'Orphaned files report generated',
            ...result
        });
    }
    catch (error) {
        console.error('❌ Orphaned files check failed:', error);
        res.status(500).json({
            success: false,
            error: 'Orphaned files check failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
/**
 * Fix missing 2022 FS.pdf file
 */
router.post('/fix-missing-file/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        // Check if document exists in database
        const doc = await sql `
      SELECT * FROM documents WHERE id = ${documentId} LIMIT 1
    `;
        if (doc.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Document not found in database'
            });
        }
        const document = doc[0];
        // Check if file exists with wrong extension
        const expectedPath = `uploads/documents/${documentId}.pdf`;
        const currentPath = `uploads/documents/${documentId}.txt`;
        if (fs.existsSync(currentPath) && !fs.existsSync(expectedPath)) {
            // File exists but with wrong extension - this is likely a regenerated placeholder
            console.log(`🔧 [FIX] Found file with wrong extension: ${currentPath}`);
            // Update database to reflect actual file type
            await sql `
        UPDATE documents 
        SET file_type = 'text/plain',
            name = ${document.name.replace('.pdf', '.txt')}
        WHERE id = ${documentId}
      `;
            console.log(`✅ [FIX] Updated database record to match actual file type`);
            return res.json({
                success: true,
                message: 'Database updated to match actual file',
                actualFile: currentPath,
                documentType: 'regenerated_placeholder'
            });
        }
        return res.status(404).json({
            success: false,
            error: 'Physical file not found',
            expectedPath,
            currentPath,
            suggestion: 'File needs to be re-uploaded'
        });
    }
    catch (error) {
        console.error('❌ Fix missing file failed:', error);
        res.status(500).json({
            success: false,
            error: 'Fix missing file failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
