// Pipeline types and constants
export const LANES = ['new','requires_docs','in_review','with_lender','accepted','declined'] as const;
export type Lane = typeof LANES[number];

export const labels: Record<Lane, string> = {
  'new': 'New',
  'requires_docs': 'Needs Docs',
  'in_review': 'In Review',
  'with_lender': 'With Lender',
  'accepted': 'Accepted',
  'declined': 'Declined'
};

export type Card = {
  id: string;
  businessName: string;
  status: string;        // lane/stage
  amount: number;
  owner?: string;
  createdAt?: string;
  // extend as needed
  title?: string;
  contact?: string;
};

export type Stage = { id: string; name: string; cards: Card[] };
export type Board = { stages: Stage[] };

export type CardDetail = Card & {
  contact?: { name?: string; email?: string; phone?: string };
  applicants?: Array<{ name: string; role?: string }>;
  documents?: Array<{ id: string; name: string; type: string; uploadedAt?: string }>;
  // add lender recs etc.
};

export type TimelineEvent = { id: string; ts: string; kind: string; summary: string; meta?: any };
export type OcrConflict = { id: string; field: string; valueA: string; valueB: string; confidence?: number };

export type LenderRec = {
  id: string;
  lender: string;
  product: string;
  category: string;
  match: number;
  reason?: string;
};