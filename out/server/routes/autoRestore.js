import express from 'express';
import { db } from '../db';
import { documents } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
const router = express.Router();
// Auto-restore orphaned document records by creating placeholder files
router.post('/restore-orphaned/:applicationId', async (req, res) => {
    const { applicationId } = req.params;
    try {
        console.log(`🔧 [AUTO-RESTORE] Starting auto-restore for application: ${applicationId}`);
        // Find documents with missing file paths or file_exists=false using raw query
        const { sql } = await import('drizzle-orm');
        const orphanedDocs = await db.execute(sql `
      SELECT * FROM documents 
      WHERE applicationId = ${applicationId} 
      AND file_exists = false
    `);
        console.log(`🔧 [AUTO-RESTORE] Found ${orphanedDocs.length} orphaned documents`);
        let restoredCount = 0;
        const results = [];
        for (const doc of orphanedDocs) {
            try {
                // Skip if this document already has a working replacement
                const workingDocs = await db
                    .select()
                    .from(documents)
                    .where(and(eq(documents.applicationId, applicationId), eq(documents.document_type, doc.document_type), eq(documents.file_exists, true)));
                if (workingDocs.length > 0) {
                    console.log(`✅ [AUTO-RESTORE] Skipping ${doc.name} - working replacement exists`);
                    results.push({
                        documentId: doc.id,
                        fileName: doc.name,
                        success: true,
                        action: 'skipped_has_replacement'
                    });
                    continue;
                }
                // Create placeholder file if none exists
                const filePath = path.resolve('uploads', 'documents', `${doc.id}.pdf`);
                const placeholderContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 700 Td
(Document Placeholder: ${doc.name}) Tj
0 -20 Td
(Original document missing - please re-upload) Tj
0 -20 Td
(Document ID: ${doc.id}) Tj
0 -20 Td
(Application: ${applicationId}) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000348 00000 n 
0000000565 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
640
%%EOF`;
                // Ensure directory exists
                await fs.mkdir(path.dirname(filePath), { recursive: true });
                // Write placeholder file
                await fs.writeFile(filePath, placeholderContent);
                // Update database record
                await db
                    .update(documents)
                    .set({
                    file_exists: true,
                    file_path: `uploads/documents/${doc.id}.pdf`,
                    size: placeholderContent.length,
                    file_type: 'application/pdf',
                    updatedAt: new Date()
                })
                    .where(eq(documents.id, doc.id));
                console.log(`✅ [AUTO-RESTORE] Restored ${doc.name} with placeholder`);
                restoredCount++;
                results.push({
                    documentId: doc.id,
                    fileName: doc.name,
                    success: true,
                    action: 'placeholder_created',
                    filePath
                });
            }
            catch (error) {
                console.error(`❌ [AUTO-RESTORE] Failed to restore ${doc.name}:`, error instanceof Error ? error.message : String(error));
                results.push({
                    documentId: doc.id,
                    fileName: doc.name,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        console.log(`🎯 [AUTO-RESTORE] Completed: ${restoredCount}/${orphanedDocs.length} restored`);
        res.json({
            success: true,
            message: `Auto-restore completed: ${restoredCount} documents restored`,
            restoredCount,
            totalOrphaned: orphanedDocs.length,
            results
        });
    }
    catch (error) {
        console.error('❌ [AUTO-RESTORE] Error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
