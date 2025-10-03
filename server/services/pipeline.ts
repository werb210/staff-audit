export type PipelineStage = "new" | "requires_docs" | "in_review" | "sent_to_lender" | "closed";

export const PIPELINE_STAGES: { id: PipelineStage; label: string }[] = [
  { id: "new",             label: "New" },
  { id: "requires_docs",   label: "Requires Docs" },
  { id: "in_review",       label: "In Review" },
  { id: "sent_to_lender",  label: "Sent to Lender" },
  { id: "closed",          label: "Closed" },
];

export function normalizeStage(s: unknown): PipelineStage {
  const v = String(s || "").toLowerCase().trim() as PipelineStage;
  const allowed = new Set(PIPELINE_STAGES.map(x => x.id));
  if (!allowed.has(v)) throw new Error("invalid_stage");
  return v;
}