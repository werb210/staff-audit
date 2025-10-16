export type SourceType = 'client' | 'ocr' | 'banking' | 'staff' | 'external';

export interface SourcedValue {
  column: string;                 // canonical DB column (e.g., req_business_address, income_statement_net_income)
  value: string | number | boolean | null;
  sourceType: SourceType;         // where it came from
  sourceId: string;               // doc id, form id, job id, etc.
  label?: string;                 // human label (e.g., "Income Statement", "Client Application")
  observedAt?: string;            // ISO timestamp
}