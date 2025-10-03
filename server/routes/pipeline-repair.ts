import { Router } from "express";

type StageId = "new" | "requires_docs" | "in_review" | "sent_to_lender" | "closed";
type AppCard = {
  id: string;
  businessName: string;
  contactName: string;
  amountRequested: number;
  status: StageId;
  updatedAt: string;
  timeline?: { ts: string; message: string }[];
};

const demo: Record<StageId, AppCard[]> = {
  new: [
    { id: "A-1001", businessName: "North Ridge Tools", contactName: "A. Patel", amountRequested: 85000, status: "new", updatedAt: new Date().toISOString(), timeline: [] },
    { id: "A-1002", businessName: "Blue Harbor Cafe", contactName: "K. Wong", amountRequested: 40000, status: "new", updatedAt: new Date().toISOString(), timeline: [] }
  ],
  requires_docs: [
    { id: "A-1003", businessName: "Evergreen Logistics", contactName: "M. Silva", amountRequested: 125000, status: "requires_docs", updatedAt: new Date().toISOString(), timeline: [] }
  ],
  in_review: [
    { id: "A-1004", businessName: "Prairie Dental", contactName: "J. Dhillon", amountRequested: 220000, status: "in_review", updatedAt: new Date().toISOString(), timeline: [] }
  ],
  sent_to_lender: [],
  closed: []
};

const r = Router();

/** Return a board: stages → cards. */
r.get("/board", (_req, res) => {
  res.json({ ok: true, board: demo });
});

/** Simple metrics. */
r.get("/metrics", (_req, res) => {
  const counts: Record<StageId, number> = {
    new: demo.new.length,
    requires_docs: demo.requires_docs.length,
    in_review: demo.in_review.length,
    sent_to_lender: demo.sent_to_lender.length,
    closed: demo.closed.length
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  res.json({ ok: true, counts, total });
});

/** Move a card to a different stage. */
r.post("/move", (req: any, res: any) => {
  const { id, to } = req.body || {};
  const target: StageId = to;
  if (!id || !target) return res.status(400).json({ ok: false, error: "id and to are required" });

  // remove from current stage
  let card: AppCard | undefined;
  (Object.keys(demo) as StageId[]).forEach((s) => {
    const i = demo[s].findIndex((c) => c.id === id);
    if (i >= 0) {
      [card] = demo[s].splice(i, 1);
    }
  });

  if (!card) return res.status(404).json({ ok: false, error: "card not found" });

  card.status = target;
  card.updatedAt = new Date().toISOString();
  card.timeline = [{ ts: card.updatedAt, message: `Moved to ${target}` }, ...(card.timeline || [])];
  demo[target].unshift(card);

  res.json({ ok: true, card });
});

export default r;