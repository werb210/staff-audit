import { pool } from "../db.js";
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
export async function startupFixMissingPaths() {
    console.log('[STARTUP-FIX] Starting path normalization and repair...');
    try {
        // Get all documents from database
        const result = await pool.query(`
      SELECT id, name, file_path, applicationId, size, checksum 
      FROM documents 
      ORDER BY createdAt DESC
    `);
        const documents = result.rows;
        console.log(`[STARTUP-FIX] Found ${documents.length} documents to check`);
        let fixed = 0;
        let orphaned = 0;
        let verified = 0;
        for (const doc of documents) {
            const { id, name, file_path, applicationId } = doc;
            // Define expected paths to check
            const possiblePaths = [
                file_path, // Current database path
                `uploads/documents/${id}.pdf`, // Standard UUID.pdf format
                `uploads/documents/${id}.${name?.split('.').pop() || 'pdf'}`, // UUID + original extension
            ].filter(Boolean);
            let actualPath = null;
            let fileStats = null;
            // Check which path actually exists
            for (const testPath of possiblePaths) {
                try {
                    const resolvedPath = path.resolve(testPath);
                    fileStats = await fs.stat(resolvedPath);
                    actualPath = testPath;
                    break;
                }
                catch (err) {
                    // File doesn't exist at this path, try next
                }
            }
            if (actualPath && fileStats) {
                // File found - verify and update database if needed
                const currentSize = fileStats.size;
                let needsUpdate = false;
                let updates = {};
                if (file_path !== actualPath) {
                    console.log(`[STARTUP-FIX] Correcting path for ${name}: ${file_path} → ${actualPath}`);
                    updates.file_path = actualPath;
                    needsUpdate = true;
                }
                if (!doc.checksum && currentSize > 0) {
                    // Generate missing checksum
                    try {
                        const fileBuffer = await fs.readFile(path.resolve(actualPath));
                        const hash = createHash('sha256').update(fileBuffer).digest('hex');
                        updates.checksum = hash;
                        console.log(`[STARTUP-FIX] Generated checksum for ${name}: ${hash.substring(0, 8)}...`);
                        needsUpdate = true;
                    }
                    catch (err) {
                        console.warn(`[STARTUP-FIX] Could not generate checksum for ${name}:`, err);
                    }
                }
                if (needsUpdate) {
                    const updateFields = Object.keys(updates).map((key, idx) => `${key} = $${idx + 2}`).join(', ');
                    const updateValues = [id, ...Object.values(updates)];
                    await pool.query(`UPDATE documents SET ${updateFields} WHERE id = $1`, updateValues);
                    fixed++;
                }
                else {
                    verified++;
                }
            }
            else {
                // File missing completely
                console.error(`[STARTUP-FIX] ORPHANED: ${name} (${id}) - no file found at any expected path`);
                // Mark as orphaned in database
                await pool.query('UPDATE documents SET file_exists = false, preview_status = $1 WHERE id = $2', ['orphaned_missing_file', id]);
                orphaned++;
            }
        }
        const summary = {
            total: documents.length,
            verified,
            fixed,
            orphaned,
            timestamp: new Date().toISOString()
        };
        console.log(`[STARTUP-FIX] COMPLETED:`, summary);
        // Log audit results
        await pool.query(`
      INSERT INTO document_audit_log (operation, status, documents_processed, issues_found, details, createdAt)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
            'startup_path_fix',
            orphaned > 0 ? 'issues_found' : 'success',
            documents.length,
            orphaned,
            JSON.stringify(summary)
        ]);
        return summary;
    }
    catch (error) {
        console.error('[STARTUP-FIX] Failed:', error);
        throw error;
    }
}
// Allow script to be run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startupFixMissingPaths()
        .then(summary => {
        console.log('[STARTUP-FIX] Final Summary:', JSON.stringify(summary, null, 2));
        process.exit(summary.orphaned > 0 ? 1 : 0);
    })
        .catch(error => {
        console.error('[STARTUP-FIX] Failed:', error);
        process.exit(1);
    });
}
