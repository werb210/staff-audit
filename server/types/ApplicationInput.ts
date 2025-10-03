// types/ApplicationInput.ts
export interface ApplicationInput {
  country: string;
  product_category: string;
  requested_amount: number;
  industry: string;
  time_in_business_months: number;
  monthly_revenue: number;
  documents: string[];

  banking?: {
    average_balance?: number;
    nsf_count?: number;
    daily_balance_volatility_score?: number;
  };

  ocr?: {
    net_income?: number;
    cash_flow_positive?: boolean;
  };
}