export type LenderProduct = {
  id?: string;
  lenderId: string;
  name: string;
  countryOffered?: string;
  category?: string;
  minAmount?: number; 
  maxAmount?: number;
  minRate?: number;   
  maxRate?: number;
  minTermMonths?: number; 
  maxTermMonths?: number;
  active?: boolean;
  description?: string;
  // Legacy compatibility
  productName?: string;
  productCategory?: 
    | "Working Capital"
    | "Term Loan"
    | "Line of Credit"
    | "Equipment Financing"
    | "SBA Loan"
    | "Invoice Factoring"
    | "Merchant Cash Advance"
    | "Commercial Real Estate"
    | "Purchase Order Financing"; // NEW
  minimumLendingAmount?: number;
  maximumLendingAmount?: number;
  interestRateMinimum?: number;
  interestRateMaximum?: number;
  termMinimum?: number;
  termMaximum?: number;
  isActive?: boolean;
  documentsRequired?: string[];
};

export type ProductRules = {
  minCreditScore?: number;
  minAnnualRevenue?: number;
  timeInBusinessMonths?: number;
  maxDebtToIncome?: number;
  preferredIndustries?: string[];
  excludedIndustries?: string[];
  requiredDocs?: string[];        // ["bank_statements","tax_returns",...]
  excludedRegions?: string[];     // e.g. ["CA","NY"]
  advancedLogic?: string;         // freeform expression
};

export type ProductWithRules = LenderProduct & { rules: ProductRules };