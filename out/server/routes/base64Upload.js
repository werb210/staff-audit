// Feature 6: Base64 Document Upload Endpoint
import { Router } from "express";
import { db } from "../db.js";
import { documents } from "../../shared/schema.js";
import fs from "fs";
import path from "path";
import { logUpload } from "../utils/uploadLogger.js";
const router = Router();
router.post("/upload-base64", async (req, res) => {
    try {
        const { applicationId, fileName, documentType, base64Data } = req.body;
        if (!applicationId || !fileName || !documentType || !base64Data) {
            return res.status(400).json({
                error: "Missing required fields: applicationId, fileName, documentType, base64Data"
            });
        }
        // Validate base64 format
        const base64Match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
        if (!base64Match) {
            return res.status(400).json({ error: "Invalid base64 format" });
        }
        const [, mimeType, base64Content] = base64Match;
        // Convert base64 to buffer
        const buffer = Buffer.from(base64Content, 'base64');
        // Validate file size (minimum 4KB)
        if (buffer.length < 4096) {
            await logUpload(null, "system", "failed", buffer.length, documentType, "File too small (minimum 4KB required)");
            return res.status(400).json({ error: "File too small (minimum 4KB required)" });
        }
        // Generate document ID and file path
        const documentId = crypto.randomUUID();
        const fileExtension = path.extname(fileName) || getExtensionFromMimeType(mimeType);
        const finalFileName = `${documentId}${fileExtension}`;
        const filePath = `uploads/documents/${finalFileName}`;
        // Ensure uploads directory exists
        const uploadsDir = path.dirname(filePath);
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        // Write buffer to file
        fs.writeFileSync(filePath, buffer);
        console.log(`📂 [BASE64 UPLOAD] Saved: ${filePath} | Size: ${buffer.length} bytes`);
        // Save to database
        const [savedDocument] = await db.insert(documents).values({
            id: documentId,
            applicationId,
            fileName,
            fileType: mimeType,
            fileSize: buffer.length,
            documentType,
            filePath,
            uploadedBy: "base64-api",
            isRequired: false,
            isVerified: false,
            status: "pending",
        }).returning();
        // Log successful upload
        await logUpload(documentId, "base64-api", "success", buffer.length, documentType);
        // Trigger webhook if configured
        if (process.env.DOCUMENT_WEBHOOK_URL) {
            try {
                await fetch(process.env.DOCUMENT_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        applicationId,
                        documentId,
                        status: "uploaded",
                        documentType,
                        timestamp: new Date().toISOString(),
                    }),
                });
                console.log(`📤 [WEBHOOK] Document upload notification sent for ${documentId}`);
            }
            catch (webhookError) {
                console.error("Webhook notification failed:", webhookError);
            }
        }
        res.status(201).json({
            status: "success",
            documentId,
            filename: fileName,
            size: buffer.length,
            documentType,
        });
    }
    catch (error) {
        console.error("Error processing base64 upload:", error);
        // Log failed upload
        try {
            await logUpload(null, "base64-api", "failed", 0, req.body?.documentType || "unknown", error instanceof Error ? error.message : String(error));
        }
        catch (logError) {
            console.error("Failed to log upload error:", logError);
        }
        res.status(500).json({ error: "Failed to process upload" });
    }
});
function getExtensionFromMimeType(mimeType) {
    const extensions = {
        'application/pdf': '.pdf',
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'text/plain': '.txt',
    };
    return extensions[mimeType] || '.bin';
}
export default router;
