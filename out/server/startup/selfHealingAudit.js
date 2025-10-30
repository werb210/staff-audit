import { promises as fs } from 'fs';
import path from 'path';
import { db } from '../db.js';
import { documents } from '../../shared/schema.js';
/**
 * SAFETY NET 4: Startup Self-Healing Audit
 * Runs on server boot to detect and fix orphaned files
 */
export async function runStartupDocumentAudit() {
    console.log('🔍 [STARTUP AUDIT] Beginning self-healing document audit...');
    try {
        // Scan uploads/documents directory
        const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
        let physicalFiles = [];
        try {
            const files = await fs.readdir(uploadsDir);
            physicalFiles = files.filter(file => !file.startsWith('.'));
            console.log(`📁 [STARTUP AUDIT] Found ${physicalFiles.length} physical files`);
        }
        catch (error) {
            console.log(`📁 [STARTUP AUDIT] No uploads/documents directory found - creating it`);
            await fs.mkdir(uploadsDir, { recursive: true });
            physicalFiles = [];
        }
        // Get all documents from database
        const dbDocuments = await db.select().from(documents);
        console.log(`📄 [STARTUP AUDIT] Found ${dbDocuments.length} database documents`);
        // Create sets for comparison
        const dbFilenames = new Set(dbDocuments.map(doc => path.basename(doc.filePath || '')));
        const physicalFilenames = new Set(physicalFiles);
        // Find orphaned files (physical files with no DB record)
        const orphanedFiles = physicalFiles.filter(file => !dbFilenames.has(file));
        // Find missing files (DB records with no physical file)
        const missingFiles = dbDocuments.filter(doc => {
            const filename = path.basename(doc.filePath || '');
            return !physicalFilenames.has(filename);
        });
        console.log(`🔍 [STARTUP AUDIT] Analysis complete:`);
        console.log(`   - Physical files: ${physicalFiles.length}`);
        console.log(`   - Database records: ${dbDocuments.length}`);
        console.log(`   - Orphaned files: ${orphanedFiles.length}`);
        console.log(`   - Missing files: ${missingFiles.length}`);
        // Handle missing files (LOG ONLY - DO NOT DELETE)
        if (missingFiles.length > 0) {
            console.log(`⚠️ [STARTUP AUDIT] Found ${missingFiles.length} missing file records (LOGGING ONLY - NOT DELETING)`);
            for (const missingDoc of missingFiles) {
                console.log(`   - Missing file: ${missingDoc.fileName} (${missingDoc.id}) - Application: ${missingDoc.applicationId}`);
            }
            console.log('   ⚠️ CRITICAL: Auto-deletion DISABLED to prevent data loss');
        }
        // Handle orphaned files (optional auto-recovery)
        if (orphanedFiles.length > 0) {
            console.log(`⚠️ [STARTUP AUDIT] Found ${orphanedFiles.length} orphaned files`);
            console.log('   Files without database records:', orphanedFiles);
            // Option: Auto-create recovery application for orphaned files
            // (Currently disabled - just log for manual review)
            console.log('   Note: Orphaned files logged for manual review');
        }
        console.log('✅ [STARTUP AUDIT] Self-healing audit completed successfully');
    }
    catch (error) {
        console.error('❌ [STARTUP AUDIT] Failed:', error);
    }
}
/**
 * Quick health check for document system integrity
 */
export async function quickDocumentHealthCheck() {
    const issues = [];
    try {
        // Check if uploads/documents directory exists
        const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
        try {
            await fs.access(uploadsDir);
        }
        catch {
            issues.push('uploads/documents directory missing');
        }
        // Check database connectivity
        try {
            const docCount = await db.select().from(documents);
            console.log(`📊 [HEALTH CHECK] ${docCount.length} documents in database`);
        }
        catch {
            issues.push('Database connectivity failed');
        }
        return {
            healthy: issues.length === 0,
            issues
        };
    }
    catch (error) {
        return {
            healthy: false,
            issues: ['Health check failed: ' + error.message]
        };
    }
}
