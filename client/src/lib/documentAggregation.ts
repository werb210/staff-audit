// client/src/lib/documentAggregation.ts - Step 5 documents mapping
import { toCategoryLabel } from "../../../shared/categoryTransform";

const REQUIRED_DOCS_BY_CATEGORY: Record<string, string[]> = {
  "Working Capital": ["Bank statements (3–6m)", "Photo ID"],
  "Term Loan": ["Business tax returns (2y)", "Financial statements"],
  "Line of Credit": ["Bank statements (6m)"],
  "Equipment Financing": ["Equipment quote/invoice", "Bank statements (3–6m)"],
  "SBA Loan": ["Form 1919", "Business & personal tax returns (3y)"],
  "Invoice Factoring": ["A/R aging report", "Sample invoices", "Customer list"],
  "Merchant Cash Advance": ["Bank statements (3–6m)"],
  "Commercial Real Estate": ["Purchase/lease docs", "Property info"],

  // NEW:
  "Purchase Order Financing": [
    "Copy of purchase order(s)",
    "Supplier quote / pro forma invoice",
    "Customer contract or confirmed PO",
    "A/R aging report",
    "Proof of margin (COGS vs sales price)",
    "Supplier details (W-9 or equivalent)",
  ],
};

export function requiredDocsFor(categoryInput: string): string[] {
  const cat = toCategoryLabel(categoryInput);
  return REQUIRED_DOCS_BY_CATEGORY[cat] ?? [];
}
