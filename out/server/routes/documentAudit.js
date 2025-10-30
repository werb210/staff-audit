import { Router } from 'express';
import { neon } from '@neondatabase/serverless';
import fs from 'fs/promises';
const router = Router();
const sql = neon(process.env.DATABASE_URL);
async function checkFileExists(filePath) {
    try {
        await fs.access(filePath, fs.constants.F_OK);
        return true;
    }
    catch {
        return false;
    }
}
// GET /api/document-audit - Complete document system health check
router.get('/', async (req, res) => {
    try {
        console.log('🔍 Running comprehensive document audit...');
        // Get all documents from database
        const documents = await sql `SELECT * FROM documents ORDER BY createdAt DESC`;
        console.log(`📄 Found ${documents.length} documents in database`);
        const auditResults = {
            summary: {
                totalDocuments: documents.length,
                accessible: 0,
                missing: 0,
                missingFiles: []
            },
            details: []
        };
        // Check each document
        for (const doc of documents) {
            const filePath = doc.file_path;
            const isAccessible = await checkFileExists(filePath);
            const docAudit = {
                id: doc.id,
                fileName: doc.name,
                filePath: doc.file_path,
                applicationId: doc.applicationId,
                createdAt: doc.createdAt,
                accessible: isAccessible,
                status: isAccessible ? 'OK' : 'MISSING'
            };
            auditResults.details.push(docAudit);
            if (isAccessible) {
                auditResults.summary.accessible++;
            }
            else {
                auditResults.summary.missing++;
                auditResults.summary.missingFiles.push(doc.name);
            }
        }
        console.log(`📊 Audit complete: ${auditResults.summary.accessible} accessible, ${auditResults.summary.missing} missing`);
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...auditResults
        });
    }
    catch (error) {
        console.error('❌ Document audit failed:', error);
        res.status(500).json({
            success: false,
            error: 'Document audit failed',
            message: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
