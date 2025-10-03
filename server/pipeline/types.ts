export type Stage =
  | "new"
  | "requires_docs"
  | "in_review"
  | "lender"
  | "accepted"
  | "declined";

export type DocStatus = "missing" | "pending" | "accepted" | "rejected";

export type AppDoc = { id: string; name: string; status: DocStatus; url?: string };

export type Offer = { apr: number; termMonths: number; notes?: string };

export type Application = {
  id: string;
  businessName: string;
  contact: { name: string; phone: string; email: string };
  amount: number;
  stage: Stage;
  createdAt: string;
  updatedAt: string;
  requiredDocs: string[];
  // --- NEW meta used by gates ---
  packageReady?: boolean;          // required to enter "lender"
  lenderId?: string | null;        // chosen lender once in "lender"
  offer?: Offer | null;            // set when accepted
  decision?: "approved" | "declined" | null;
  declineReason?: string | null;
};

export type Note = { id: string; author: string; body: string; at: string };

export type Audit = {
  id: string;
  appId: string;
  type:
    | "stage_changed"
    | "note_added"
    | "docs_updated"
    | "zip_requested"
    | "package_built"
    | "decision_set";
  from?: Stage;
  to?: Stage;
  at: string;
  meta?: Record<string, any>;
};