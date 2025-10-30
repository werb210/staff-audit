// Feature 1: Document Versioning Routes
import { Router } from "express";
import { db } from "../db.js";
import { documents } from "../../shared/schema.js";
import { eq, desc } from "drizzle-orm";
import fs from "fs";
import path from "path";
const router = Router();
// Get version history for a document
router.get("/:id/versions", async (req, res) => {
    try {
        const documentId = req.params.id;
        // Document versions temporarily disabled during schema migration
        const versions = [];
        console.log('Document versions disabled during schema migration');
        res.json({ versions });
    }
    catch (error) {
        console.error("Error fetching document versions:", error);
        res.status(500).json({ error: "Failed to fetch versions" });
    }
});
// Rollback to previous version
router.post("/:id/rollback/:versionNumber", async (req, res) => {
    try {
        const documentId = req.params.id;
        const versionNumber = parseInt(req.params.versionNumber);
        // Document versions temporarily disabled during schema migration
        const targetVersion = null;
        console.log('Target version disabled during schema migration');
        if (!targetVersion) {
            return res.status(404).json({ error: "Version not found" });
        }
        // Get current document
        const [currentDoc] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentId))
            .limit(1);
        if (!currentDoc) {
            return res.status(404).json({ error: "Document not found" });
        }
        // Create new version for current state before rollback
        const nextVersionNumber = await getNextVersionNumber(documentId);
        await db.insert(documentVersionsDisabled).values({
            documentId,
            versionNumber: nextVersionNumber,
            filePath: currentDoc.filePath || "",
            uploadedBy: req.user?.id || "system",
            changeLog: `Backup before rollback to version ${versionNumber}`,
        });
        // Copy target version file to main location
        if (fs.existsSync(targetVersion.filePath)) {
            const newFileName = `${documentId}.${path.extname(targetVersion.filePath)}`;
            const newFilePath = `uploads/documents/${newFileName}`;
            fs.copyFileSync(targetVersion.filePath, newFilePath);
            // Update document record
            await db
                .update(documents)
                .set({
                filePath: newFilePath,
                updatedAt: new Date(),
            })
                .where(eq(documents.id, documentId));
        }
        console.log(`✅ [VERSIONING] Rolled back document ${documentId} to version ${versionNumber}`);
        res.json({
            success: true,
            message: `Rolled back to version ${versionNumber}`,
            newVersion: nextVersionNumber
        });
    }
    catch (error) {
        console.error("Error rolling back document version:", error);
        res.status(500).json({ error: "Failed to rollback version" });
    }
});
async function getNextVersionNumber(documentId) {
    const [latestVersion] = await db
        .select({ maxVersion: documentVersionsDisabled.versionNumber })
        .from(documentVersionsDisabled)
        .where(eq(documentVersionsDisabled.documentId, documentId))
        .orderBy(desc(documentVersionsDisabled.versionNumber))
        .limit(1);
    return (latestVersion?.maxVersion || 0) + 1;
}
export default router;
