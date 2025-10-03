// types/LenderProduct.ts
export interface LenderProduct {
  id: string;
  name: string;
  country: string;
  category: string;
  min_amount: number;
  max_amount: number;
  min_time_in_business: number;
  min_monthly_revenue: number;
  required_documents: string[];
  excluded_industries?: string[];
}