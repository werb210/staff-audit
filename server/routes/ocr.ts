import { Router } from "express";
import { buildOcrView } from "../services/ocrInsights";
const router = Router();

/** GET /api/ocr/insights?appId=... */
router.get("/insights", async (req: any, res: any) => {
  try {
    const appId = req.query.appId as string;
    if (!appId) return res.status(400).json({ error: "missing_appId" });

    // TODO: load real OCR rows for this appId. Stub w/ demo rows:
    const raw = [
      { docId: "tax-2024", group: "Taxes" as const, label: "SIN", value: "123-456-789" },
      { docId: "contract-1", group: "Contracts" as const, label: "SIN", value: "123-456-789" },
      { docId: "invoice-77", group: "Invoices" as const, label: "Website URL", value: "https://acme.example" },
      { docId: "bs-2024", group: "Balance Sheet Data" as const, label: "Total Assets", value: "$1,250,000" },
      { docId: "is-2024", group: "Income Statement" as const, label: "Net Income", value: "$210,000" },
      { docId: "cf-2024", group: "Cash Flow Statements" as const, label: "Operating Cash Flow", value: "$180,000" },
      { docId: "contract-2", group: "Contracts" as const, label: "Legal Business Name", value: "Acme Corporation Inc." },
      { docId: "tax-2024", group: "Taxes" as const, label: "Legal Business Name", value: "Acme Corp Inc." },
      { docId: "invoice-77", group: "Invoices" as const, label: "Address", value: "123 Main St, Toronto ON" }
    ];

    const view = buildOcrView(raw);
    res.json(view);
  } catch (e) {
    console.error("[OCR] Insights error:", e);
    res.status(500).json({ error: "insights_failed" });
  }
});

export default router;