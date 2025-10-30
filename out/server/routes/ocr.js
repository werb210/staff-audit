import { Router } from "express";
import { buildOcrView } from "../services/ocrInsights";
const router = Router();
/** GET /api/ocr/insights?appId=... */
router.get("/insights", async (req, res) => {
    try {
        const appId = req.query.appId;
        if (!appId)
            return res.status(400).json({ error: "missing_appId" });
        // TODO: load real OCR rows for this appId. Stub w/ demo rows:
        const raw = [
            { docId: "tax-2024", group: "Taxes", label: "SIN", value: "123-456-789" },
            { docId: "contract-1", group: "Contracts", label: "SIN", value: "123-456-789" },
            { docId: "invoice-77", group: "Invoices", label: "Website URL", value: "https://acme.example" },
            { docId: "bs-2024", group: "Balance Sheet Data", label: "Total Assets", value: "$1,250,000" },
            { docId: "is-2024", group: "Income Statement", label: "Net Income", value: "$210,000" },
            { docId: "cf-2024", group: "Cash Flow Statements", label: "Operating Cash Flow", value: "$180,000" },
            { docId: "contract-2", group: "Contracts", label: "Legal Business Name", value: "Acme Corporation Inc." },
            { docId: "tax-2024", group: "Taxes", label: "Legal Business Name", value: "Acme Corp Inc." },
            { docId: "invoice-77", group: "Invoices", label: "Address", value: "123 Main St, Toronto ON" }
        ];
        const view = buildOcrView(raw);
        res.json(view);
    }
    catch (e) {
        console.error("[OCR] Insights error:", e);
        res.status(500).json({ error: "insights_failed" });
    }
});
export default router;
