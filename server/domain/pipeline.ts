export type PipelineStage =
  | "New"
  | "Requires Docs"
  | "In Review"
  | "Ready for Lenders"
  | "Sent to Lender"
  | "Funded"
  | "Closed";

export type DocumentStatus = "missing" | "uploaded" | "accepted" | "rejected";

export interface ApplicationCard {
  id: string;
  companyName: string;
  contactId: string;
  amountRequested: number;
  productCategory: "Factoring" | "Term Loan" | "LOC" | "Equipment" | "Other";
  stage: PipelineStage;
  lastUpdatedAt: string;
  likelihood?: number; // 0-100, from recommendation engine
}

export interface AppDocMeta {
  id: string;
  appId: string;
  category: string;  // e.g., "Financials", "Bank Statements", "Tax Returns"
  status: DocumentStatus;
  filename: string;
  s3Key: string;
  sha256?: string;
}

export interface StageTransition {
  appId: string;
  from: PipelineStage;
  to: PipelineStage;
  at: string;
  reason?: string;
  actor?: string;
}