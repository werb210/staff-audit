// Feature 2: Backup Status and Monitoring
import { Router } from "express";
import { db } from "../db.js";
import { documents } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { getStorageStream, uploadToStorage } from "../utils/documentStorage.js";
import fs from "fs";
import path from "path";
const router = Router();
// Get backup status for all documents
router.get("/status", async (req, res) => {
    try {
        const docs = await db
            .select()
            .from(documents);
        const backupStatus = await Promise.all(docs.map(async (doc) => {
            const hasLocalFile = doc.filePath && fs.existsSync(doc.filePath);
            const hasBackup = !!doc.storage_key;
            let backupAccessible = false;
            if (hasBackup && doc.storage_key) {
                try {
                    const stream = await getStorageStream(doc.storage_key);
                    backupAccessible = !!stream;
                }
                catch {
                    backupAccessible = false;
                }
            }
            return {
                documentId: doc.id,
                fileName: doc.fileName,
                applicationId: doc.applicationId,
                hasLocalFile,
                hasBackup,
                backupAccessible,
                storageKey: doc.storage_key,
                checksum: doc.checksum,
                status: getDocumentBackupStatus(hasLocalFile, hasBackup, backupAccessible),
                createdAt: doc.createdAt,
            };
        }));
        const summary = {
            total: backupStatus.length,
            fullyBacked: backupStatus.filter(s => s.status === "fully_backed").length,
            localOnly: backupStatus.filter(s => s.status === "local_only").length,
            backupOnly: backupStatus.filter(s => s.status === "backup_only").length,
            missing: backupStatus.filter(s => s.status === "missing").length,
            corrupted: backupStatus.filter(s => s.status === "corrupted").length,
        };
        res.json({ documents: backupStatus, summary });
    }
    catch (error) {
        console.error("Error checking backup status:", error);
        res.status(500).json({ error: "Failed to check backup status" });
    }
});
// Force backup of specific document
router.post("/:id/backup", async (req, res) => {
    try {
        const documentId = req.params.id;
        const [doc] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentId))
            .limit(1);
        if (!doc) {
            return res.status(404).json({ error: "Document not found" });
        }
        if (!doc.filePath || !fs.existsSync(doc.filePath)) {
            return res.status(400).json({ error: "Local file not found" });
        }
        console.log(`🔄 [BACKUP] Force backup initiated for document: ${documentId}`);
        // Upload to object storage
        const storageKey = await uploadToStorage(doc.filePath, `documents/${documentId}${path.extname(doc.fileName)}`);
        // Update document record
        await db
            .update(documents)
            .set({
            storage_key: storageKey,
            updatedAt: new Date()
        })
            .where(eq(documents.id, documentId));
        console.log(`✅ [BACKUP] Document ${documentId} successfully backed up with key: ${storageKey}`);
        res.json({ success: true, storageKey });
    }
    catch (error) {
        console.error("Error backing up document:", error);
        res.status(500).json({ error: "Failed to backup document" });
    }
});
// Restore document from backup
router.post("/:id/restore", async (req, res) => {
    try {
        const documentId = req.params.id;
        const [doc] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentId))
            .limit(1);
        if (!doc) {
            return res.status(404).json({ error: "Document not found" });
        }
        if (!doc.storage_key) {
            return res.status(400).json({ error: "No backup available" });
        }
        console.log(`🔄 [RESTORE] Restoring document from backup: ${documentId}`);
        // Get stream from object storage
        const stream = await getStorageStream(doc.storage_key);
        // Restore to local file
        const restorePath = doc.filePath || `uploads/documents/${documentId}${path.extname(doc.fileName)}`;
        const writeStream = fs.createWriteStream(restorePath);
        await new Promise((resolve, reject) => {
            stream.pipe(writeStream);
            stream.on('end', resolve);
            stream.on('error', reject);
        });
        // Update file path if it was missing
        if (!doc.filePath) {
            await db
                .update(documents)
                .set({
                filePath: restorePath,
                updatedAt: new Date()
            })
                .where(eq(documents.id, documentId));
        }
        console.log(`✅ [RESTORE] Document ${documentId} successfully restored to: ${restorePath}`);
        res.json({ success: true, filePath: restorePath });
    }
    catch (error) {
        console.error("Error restoring document:", error);
        res.status(500).json({ error: "Failed to restore document" });
    }
});
function getDocumentBackupStatus(hasLocal, hasBackup, backupAccessible) {
    if (hasLocal && hasBackup && backupAccessible)
        return "fully_backed";
    if (hasLocal && !hasBackup)
        return "local_only";
    if (!hasLocal && hasBackup && backupAccessible)
        return "backup_only";
    if (!hasLocal && !hasBackup)
        return "missing";
    if (hasBackup && !backupAccessible)
        return "corrupted";
    return "unknown";
}
export default router;
