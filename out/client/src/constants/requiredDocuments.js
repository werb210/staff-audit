// client/src/constants/requiredDocuments.ts - Updated with canonical categories
import { CATEGORY_LIST } from "../../../shared/categories";
// Use canonical category labels for forms
export const PRODUCT_CATEGORIES = CATEGORY_LIST.map((c) => c.label);
// Legacy export for backward compatibility - now using the unified system
export const REQUIRED_DOCUMENTS = {
    "Working Capital": ["Bank statements (3–6m)", "Photo ID"],
    "Term Loan": ["Business tax returns (2y)", "Financial statements"],
    "Line of Credit": ["Bank statements (6m)"],
    "Equipment Financing": ["Equipment quote/invoice", "Bank statements (3–6m)"],
    "SBA Loan": ["Form 1919", "Business & personal tax returns (3y)"],
    "Invoice Factoring": ["A/R aging report", "Sample invoices", "Customer list"],
    "Merchant Cash Advance": ["Bank statements (3–6m)"],
    "Commercial Real Estate": ["Purchase/lease docs", "Property info"],
    "Purchase Order Financing": [
        "Copy of purchase order(s)",
        "Supplier quote / pro forma invoice",
        "Customer contract or confirmed PO",
        "A/R aging report",
        "Proof of margin (COGS vs sales price)",
        "Supplier details (W-9 or equivalent)",
    ],
};
