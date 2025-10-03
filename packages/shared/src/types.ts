export type UserRole = "client" | "staff" | "admin" | "lender" | "referrer";

export type ApplicationStatus = 
  | "draft" 
  | "submitted" 
  | "under_review" 
  | "lender_match" 
  | "approved" 
  | "declined" 
  | "funded";

export type LoanCategory = 
  | "term_loan" 
  | "line_of_credit" 
  | "sba_loan" 
  | "equipment_loan" 
  | "merchant_cash_advance";

export type DocumentType = 
  | "bank_statements" 
  | "tax_returns" 
  | "financial_statements" 
  | "business_license" 
  | "other";

export type CommunicationType = "email" | "sms" | "call" | "note";

export type SignatureStatus = "pending" | "signed" | "declined" | "expired";

export interface AIRecommendation {
  productId: string;
  productName: string;
  category: LoanCategory;
  matchScore: number;
  minAmount: number;
  maxAmount: number;
  reasons: string[];
}

export interface ApplicationFormData {
  step: number;
  businessInfo?: {
    businessName: string;
    businessType: string;
    industry: string;
    yearEstablished: number;
    ein?: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    phone: string;
    website?: string;
    description?: string;
  };
  financialInfo?: {
    annualRevenue: number;
    monthlyRevenue: number;
    monthlyExpenses?: number;
    timeInBusiness: string;
    creditScore?: number;
    bankBalance?: number;
  };
  loanInfo?: {
    requestedAmount: number;
    useOfFunds: string;
    selectedProduct?: string;
  };
  documents?: {
    uploaded: string[];
    required: string[];
  };
}

export interface DashboardStats {
  totalApplications: number;
  approvedApplications: number;
  pendingApplications: number;
  totalFunded: number;
  conversionRate: number;
  averageProcessingTime: number;
}

export interface PipelineColumn {
  id: string;
  name: string;
  applications: Application[];
  color: string;
}
