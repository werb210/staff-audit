// shared/categoryRules.ts - Business rules (revenue, FICO, eligibility)
export const CategoryRules = {
    "Working Capital": { minMonthlyRevenue: 8333, minCreditScore: 640 },
    "Term Loan": { minMonthlyRevenue: 0, minCreditScore: 650 },
    "Line of Credit": { minMonthlyRevenue: 10000, minCreditScore: 660 },
    "Equipment Financing": { minMonthlyRevenue: 16667, minCreditScore: 620 },
    "SBA Loan": { minMonthlyRevenue: 12500, minCreditScore: 680 },
    "Invoice Factoring": { minMonthlyRevenue: 20833, minCreditScore: 580 },
    "Merchant Cash Advance": { minMonthlyRevenue: 6250, minCreditScore: 550 },
    "Commercial Real Estate": { minMonthlyRevenue: 0, minCreditScore: 660 },
    // NEW — suggested defaults (adjust if you prefer different):
    "Purchase Order Financing": {
        minMonthlyRevenue: 15000, // ~180k/yr typical min
        minCreditScore: 600,
        industryRestriction: ["Retail", "Manufacturing"], // gating
        // optional: PO-specific knobs that help Step 5 documents/UI:
        minGrossMarginPct: 15,
        minPOAmount: 5000,
        advanceRatePct: 50, // informational default
    },
};
