export const USER_ROLES = {
  CLIENT: "client",
  STAFF: "staff", 
  ADMIN: "admin",
  LENDER: "lender",
  REFERRER: "referrer"
} as const;

export const APPLICATION_STATUSES = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  LENDER_MATCH: "lender_match",
  APPROVED: "approved",
  DECLINED: "declined",
  FUNDED: "funded"
} as const;

export const LOAN_CATEGORIES = {
  TERM_LOAN: "term_loan",
  LINE_OF_CREDIT: "line_of_credit",
  SBA_LOAN: "sba_loan",
  EQUIPMENT_LOAN: "equipment_loan",
  MERCHANT_CASH_ADVANCE: "merchant_cash_advance"
} as const;

export const DOCUMENT_TYPES = {
  ACCOUNTS_PAYABLE: "accounts_payable",
  ACCOUNTS_RECEIVABLE: "accounts_receivable",
  AP: "ap",
  AR: "ar",
  ARTICLES_OF_INCORPORATION: "articles_of_incorporation",
  BALANCE_SHEET: "balance_sheet",
  BANK_STATEMENTS: "bank_statements",
  BUSINESS_LICENSE: "business_license",
  BUSINESS_PLAN: "business_plan",
  CASH_FLOW_STATEMENT: "cash_flow_statement",
  COLLATERAL_DOCS: "collateral_docs",
  DRIVERS_LICENSE_FRONT_BACK: "drivers_license_front_back",
  EQUIPMENT_PHOTOS: "equipment_photos",
  EQUIPMENT_QUOTE: "equipment_quote",
  FINANCIAL_STATEMENTS: "financial_statements",
  INVOICE_SAMPLES: "invoice_samples",
  OTHER: "other",
  PERSONAL_FINANCIAL_STATEMENT: "personal_financial_statement",
  PERSONAL_GUARANTEE: "personal_guarantee",
  PROFIT_AND_LOSS_STATEMENT: "profit_and_loss_statement",
  PROFIT_LOSS_STATEMENT: "profit_loss_statement",
  PROOF_OF_IDENTITY: "proof_of_identity",
  PURCHASE_ORDERS: "purchase_orders",
  SBA_FORMS: "sba_forms",
  SIGNED_APPLICATION: "signed_application",
  SUPPLIER_AGREEMENT: "supplier_agreement",
  TAX_RETURNS: "tax_returns",
  VOID_PAD: "void_pad"
} as const;

export const APPLICATION_STEPS = {
  BUSINESS_INFO: 1,
  FINANCIAL_INFO: 2,
  USE_OF_FUNDS: 3,
  DOCUMENTS: 4,
  REVIEW: 5
} as const;

export const PIPELINE_STAGES = [
  { name: "New Applications", color: "#3B82F6", status: "submitted" },
  { name: "Under Review", color: "#F59E0B", status: "under_review" },
  { name: "Lender Match", color: "#8B5CF6", status: "lender_match" },
  { name: "Approved", color: "#10B981", status: "approved" },
  { name: "Declined", color: "#EF4444", status: "declined" }
];

export const TIME_IN_BUSINESS_OPTIONS = [
  { value: "less_than_6_months", label: "Less than 6 months" },
  { value: "6_to_12_months", label: "6-12 months" },
  { value: "1_to_2_years", label: "1-2 years" },
  { value: "2_plus_years", label: "2+ years" }
];

export const CREDIT_SCORE_RANGES = [
  { value: "below_600", label: "Below 600" },
  { value: "600_to_649", label: "600-649" },
  { value: "650_to_699", label: "650-699" },
  { value: "700_plus", label: "700+" }
];

export const BUSINESS_TYPES = [
  "LLC",
  "Corporation",
  "Partnership", 
  "Sole Proprietorship",
  "S-Corporation",
  "Non-Profit",
  "Other"
];

export const INDUSTRIES = [
  "Retail",
  "Restaurant/Food Service",
  "Professional Services",
  "Healthcare",
  "Technology",
  "Construction",
  "Manufacturing",
  "Real Estate",
  "Transportation",
  "Other"
];
