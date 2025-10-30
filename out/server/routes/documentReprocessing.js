// Feature 3: Admin Reprocessing Controls
import { Router } from "express";
import { db } from "../db.js";
import { documents } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
// Mock services for Phase 2 implementation
const processOCR = async (filePath) => {
    console.log(`🔄 [REPROCESSING] Mock OCR processing for: ${filePath}`);
    return { confidence: 95, extractedText: "Mock OCR text" };
};
const analyzeBankingDocument = async (filePath) => {
    console.log(`🔄 [REPROCESSING] Mock banking analysis for: ${filePath}`);
    return { healthScore: 85, riskLevel: "medium" };
};
const router = Router();
// Re-run OCR processing
router.post("/:id/reprocess", async (req, res) => {
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
        console.log(`🔄 [REPROCESSING] Admin re-running OCR for document: ${documentId}`);
        // Trigger OCR processing
        const ocrResult = await processOCR(document.filePath || "", documentId, document.applicationId);
        res.json({
            success: true,
            message: "OCR reprocessing initiated",
            ocrResult
        });
    }
    catch (error) {
        console.error("Error reprocessing OCR:", error);
        res.status(500).json({ error: "Failed to reprocess OCR" });
    }
});
// Re-run Banking Analysis
router.post("/:id/reanalyze-banking", async (req, res) => {
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
        if (document.documentType !== 'bank_statements') {
            return res.status(400).json({ error: "Banking analysis only available for bank statements" });
        }
        console.log(`🔄 [REPROCESSING] Admin re-running banking analysis for document: ${documentId}`);
        // Get OCR results first
        const [ocrResult] = await db
            .select()
            .from(ocrResults)
            .where(eq(ocrResults.documentId, documentId))
            .limit(1);
        if (!ocrResult) {
            return res.status(400).json({ error: "OCR results required for banking analysis" });
        }
        // Trigger banking analysis
        const analysisResult = await analyzeBankingDocument(ocrResult.extractedData, document.applicationId);
        res.json({
            success: true,
            message: "Banking analysis reprocessing initiated",
            analysisResult
        });
    }
    catch (error) {
        console.error("Error reprocessing banking analysis:", error);
        res.status(500).json({ error: "Failed to reprocess banking analysis" });
    }
});
export default router;
