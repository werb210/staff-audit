import express from 'express';
import { db } from '../db';
import fs from 'fs/promises';
import path from 'path';
const router = express.Router();
// 🔄 DOCUMENT RESTORATION: Replace placeholder files with actual documents
router.post('/restore-actual-documents/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        console.log(`🔄 [DOCUMENT RESTORATION] Starting actual document restoration for: ${applicationId}`);
        // Get all placeholder documents (.txt files) for this application
        const placeholderQuery = `
      SELECT id, name, file_path, file_type 
      FROM documents 
      WHERE applicationId = $1 
      AND (file_path LIKE '%.txt' OR file_type IS NULL OR file_type = '')
    `;
        const placeholderResult = await db.query(placeholderQuery, [applicationId]);
        const placeholders = placeholderResult.rows;
        if (placeholders.length === 0) {
            return res.json({
                success: true,
                message: 'No placeholder documents found - all documents are already properly linked',
                restoredCount: 0
            });
        }
        console.log(`📋 [DOCUMENT RESTORATION] Found ${placeholders.length} placeholder documents to restore`);
        // Get all available document files in uploads/documents/
        const uploadsDir = path.join(process.cwd(), 'uploads/documents');
        const allFiles = await fs.readdir(uploadsDir);
        const actualFiles = allFiles.filter(file => file.match(/\.(pdf|xlsx|docx|jpg|jpeg|png|gif|txt)$/i) &&
            !file.includes('placeholder') &&
            !file.includes('backup'));
        console.log(`📁 [DOCUMENT RESTORATION] Found ${actualFiles.length} actual files available for restoration`);
        const results = [];
        let restoredCount = 0;
        for (const placeholder of placeholders) {
            try {
                console.log(`🔄 [DOCUMENT RESTORATION] Processing: ${placeholder.name} (${placeholder.id})`);
                // Extract original filename from placeholder content or database
                let originalFileName = placeholder.name;
                if (originalFileName.endsWith('.txt')) {
                    originalFileName = originalFileName.replace('.txt', '');
                }
                // Try to find matching actual file by document ID
                const matchingFiles = actualFiles.filter(file => file.startsWith(placeholder.id) && !file.endsWith('.txt'));
                if (matchingFiles.length > 0) {
                    const actualFile = matchingFiles[0];
                    const actualFilePath = path.join(uploadsDir, actualFile);
                    // Check if file exists
                    const fileStats = await fs.stat(actualFilePath);
                    // Determine correct file type from extension
                    const fileExt = path.extname(actualFile).toLowerCase();
                    let mimeType = 'application/octet-stream';
                    switch (fileExt) {
                        case '.pdf':
                            mimeType = 'application/pdf';
                            break;
                        case '.xlsx':
                            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                            break;
                        case '.docx':
                            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                            break;
                        case '.jpg':
                        case '.jpeg':
                            mimeType = 'image/jpeg';
                            break;
                        case '.png':
                            mimeType = 'image/png';
                            break;
                        case '.gif':
                            mimeType = 'image/gif';
                            break;
                        case '.txt':
                            mimeType = 'text/plain';
                            break;
                    }
                    // Update database record to point to actual file
                    const updateQuery = `
            UPDATE documents 
            SET file_path = $1, 
                file_type = $2, 
                size = $3,
                name = $4,
                updatedAt = NOW()
            WHERE id = $5
          `;
                    const newFilePath = `uploads/documents/${actualFile}`;
                    const restoredFileName = originalFileName + fileExt;
                    await db.query(updateQuery, [
                        newFilePath,
                        mimeType,
                        fileStats.size,
                        restoredFileName,
                        placeholder.id
                    ]);
                    // Remove placeholder .txt file if it exists
                    const placeholderPath = path.join(uploadsDir, `${placeholder.id}.txt`);
                    try {
                        await fs.unlink(placeholderPath);
                        console.log(`🗑️ [DOCUMENT RESTORATION] Removed placeholder: ${placeholder.id}.txt`);
                    }
                    catch (unlinkError) {
                        console.log(`ℹ️ [DOCUMENT RESTORATION] Placeholder file not found: ${placeholderPath}`);
                    }
                    results.push({
                        documentId: placeholder.id,
                        originalName: placeholder.name,
                        restoredName: restoredFileName,
                        actualFile: actualFile,
                        fileSize: fileStats.size,
                        mimeType: mimeType,
                        status: 'RESTORED'
                    });
                    restoredCount++;
                    console.log(`✅ [DOCUMENT RESTORATION] Successfully restored: ${restoredFileName}`);
                }
                else {
                    console.log(`⚠️ [DOCUMENT RESTORATION] No matching file found for: ${placeholder.name}`);
                    results.push({
                        documentId: placeholder.id,
                        originalName: placeholder.name,
                        status: 'NO_MATCH_FOUND',
                        error: 'No matching actual file found in uploads directory'
                    });
                }
            }
            catch (error) {
                console.error(`❌ [DOCUMENT RESTORATION] Error processing ${placeholder.name}:`, error);
                results.push({
                    documentId: placeholder.id,
                    originalName: placeholder.name,
                    status: 'ERROR',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        const successRate = Math.round((restoredCount / placeholders.length) * 100);
        res.json({
            success: true,
            message: `Document restoration completed: ${restoredCount}/${placeholders.length} documents restored`,
            restoration: {
                applicationId,
                totalPlaceholders: placeholders.length,
                restoredCount,
                successRate: `${successRate}%`,
                results,
                timestamp: new Date().toISOString()
            }
        });
        console.log(`🎯 [DOCUMENT RESTORATION] Restoration complete: ${successRate}% success rate`);
    }
    catch (error) {
        console.error('❌ [DOCUMENT RESTORATION] Restoration failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to restore documents',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
// 🔍 GET: Check restoration status for application
router.get('/status/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        // Count placeholder vs actual documents
        const statusQuery = `
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN file_path LIKE '%.txt' THEN 1 END) as placeholder_count,
        COUNT(CASE WHEN file_path NOT LIKE '%.txt' AND file_path IS NOT NULL THEN 1 END) as actual_count
      FROM documents 
      WHERE applicationId = $1
    `;
        const result = await pool.query(statusQuery, [applicationId]);
        const stats = result.rows[0];
        res.json({
            success: true,
            applicationId,
            documentStatus: {
                totalDocuments: parseInt(stats.total_documents),
                placeholderDocuments: parseInt(stats.placeholder_count),
                actualDocuments: parseInt(stats.actual_count),
                restorationNeeded: parseInt(stats.placeholder_count) > 0,
                restorationPercentage: Math.round((parseInt(stats.actual_count) / parseInt(stats.total_documents)) * 100)
            }
        });
    }
    catch (error) {
        console.error('❌ [DOCUMENT RESTORATION] Status check failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check restoration status',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
