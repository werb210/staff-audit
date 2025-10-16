// shared/categories.ts - Canonical category list (labels + slugs)
export const CATEGORY = {
  WORKING_CAPITAL:              { slug: "working_capital",              label: "Working Capital" },
  TERM_LOAN:                    { slug: "term_loan",                    label: "Term Loan" },
  LINE_OF_CREDIT:               { slug: "line_of_credit",               label: "Line of Credit" },
  EQUIPMENT_FINANCING:          { slug: "equipment_financing",          label: "Equipment Financing" },
  SBA_LOAN:                     { slug: "sba_loan",                     label: "SBA Loan" },
  INVOICE_FACTORING:            { slug: "factoring",                    label: "Invoice Factoring" },
  MERCHANT_CASH_ADVANCE:        { slug: "merchant_cash_advance",        label: "Merchant Cash Advance" },
  COMMERCIAL_REAL_ESTATE:       { slug: "commercial_real_estate",       label: "Commercial Real Estate" },
  PURCHASE_ORDER_FINANCING:     { slug: "purchase_order_financing",     label: "Purchase Order Financing" }, // NEW
} as const;

export type CategorySlug = typeof CATEGORY[keyof typeof CATEGORY]["slug"];
export type CategoryLabel = typeof CATEGORY[keyof typeof CATEGORY]["label"];
export const CATEGORY_LIST = Object.values(CATEGORY);
export const CATEGORY_SLUGS = CATEGORY_LIST.map(c => c.slug);