// Feature 7: Comprehensive Audit Trails
import { Router } from "express";
import { db } from "../db.js";
import { documents } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
const router = Router();
// Get comprehensive audit trail for a document
router.get("/:id/audit", async (req, res) => {
    try {
        const documentId = req.params.id;
        // Get document details
        const [document] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentId))
            .limit(1);
        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }
        // Version history temporarily disabled during schema migration
        const versions = [];
        console.log('Document versions disabled during schema migration');
        // Upload logs temporarily disabled during schema migration
        const uploadLogs = [];
        console.log('Upload logs disabled during schema migration');
        // OCR results temporarily disabled during schema migration
        const ocrHistory = [];
        console.log('OCR history disabled during schema migration');
        // Banking analysis temporarily disabled during schema migration
        const bankingHistory = [];
        console.log('Banking history disabled during schema migration');
        // Create timeline
        const timeline = [];
        // Add document creation
        timeline.push({
            timestamp: document.createdAt,
            type: "document_created",
            description: `Document uploaded: ${document.fileName}`,
            user: document.uploadedBy,
            metadata: {
                fileSize: document.fileSize,
                documentType: document.documentType,
            }
        });
        // Add versions
        versions.forEach(version => {
            timeline.push({
                timestamp: version.createdAt,
                type: "version_created",
                description: `Version ${version.versionNumber}: ${version.changeLog}`,
                user: version.uploadedBy,
                metadata: {
                    versionNumber: version.versionNumber,
                    filePath: version.filePath,
                }
            });
        });
        // Add upload logs
        uploadLogs.forEach(log => {
            timeline.push({
                timestamp: log.timestamp,
                type: `upload_${log.status}`,
                description: log.status === "success"
                    ? `Upload successful (${log.fileSize} bytes)`
                    : `Upload failed: ${log.errorMessage}`,
                user: log.uploadedBy,
                metadata: {
                    status: log.status,
                    fileSize: log.fileSize,
                    errorMessage: log.errorMessage,
                }
            });
        });
        // Add OCR processing
        ocrHistory.forEach(ocr => {
            timeline.push({
                timestamp: ocr.processedAt,
                type: "ocr_processed",
                description: `OCR processed with ${ocr.confidence}% confidence`,
                user: "system",
                metadata: {
                    confidence: ocr.confidence,
                    extractedTextLength: ocr.extractedData?.length || 0,
                }
            });
        });
        // Add banking analysis
        bankingHistory.forEach(analysis => {
            timeline.push({
                timestamp: analysis.createdAt,
                type: "banking_analyzed",
                description: `Banking analysis completed (Health Score: ${analysis.healthScore})`,
                user: "system",
                metadata: {
                    healthScore: analysis.healthScore,
                    riskLevel: analysis.riskLevel,
                }
            });
        });
        // Sort timeline by timestamp (newest first)
        timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const auditTrail = {
            document: {
                id: document.id,
                fileName: document.fileName,
                documentType: document.documentType,
                applicationId: document.applicationId,
                createdAt: document.createdAt,
                updatedAt: document.updatedAt,
                checksum: document.checksum,
                storageKey: document.storage_key,
            },
            timeline,
            summary: {
                totalEvents: timeline.length,
                versions: versions.length,
                uploadAttempts: uploadLogs.length,
                ocrProcessed: ocrHistory.length > 0,
                bankingAnalyzed: bankingHistory.length > 0,
                hasBackup: !!document.storage_key,
            }
        };
        res.json(auditTrail);
    }
    catch (error) {
        console.error("Error fetching audit trail:", error);
        res.status(500).json({ error: "Failed to fetch audit trail" });
    }
});
// Get audit summary for multiple documents
router.get("/summary", async (req, res) => {
    try {
        const { applicationId } = req.query;
        let query = db.select().from(documents);
        if (applicationId) {
            query = query.where(eq(documents.applicationId, applicationId));
        }
        const docs = await query;
        const summary = await Promise.all(docs.map(async (doc) => {
            const versionCount = await db
                .select({ count: documentVersions.id })
                .from(documentVersions)
                .where(eq(documentVersions.documentId, doc.id));
            const uploadCount = await db
                .select({ count: documentUploadLogs.id })
                .from(documentUploadLogs)
                .where(eq(documentUploadLogs.documentId, doc.id));
            return {
                documentId: doc.id,
                fileName: doc.fileName,
                documentType: doc.documentType,
                applicationId: doc.applicationId,
                createdAt: doc.createdAt,
                versions: versionCount.length,
                uploads: uploadCount.length,
                hasBackup: !!doc.storage_key,
                hasChecksum: !!doc.checksum,
            };
        }));
        res.json({ documents: summary });
    }
    catch (error) {
        console.error("Error fetching audit summary:", error);
        res.status(500).json({ error: "Failed to fetch audit summary" });
    }
});
export default router;
