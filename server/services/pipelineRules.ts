import { PipelineStage, AppDocMeta } from "../domain/pipeline";

/**
 * Rule A: New apps with zero docs => "Requires Docs"
 * Rule B: Any rejected doc => "Requires Docs"
 * Rule C: When all required docs accepted => "Ready for Lenders"
 */
export function evaluateStage(current: PipelineStage, docs: AppDocMeta[]): PipelineStage {
  const anyUploaded = docs.length > 0;
  const anyRejected = docs.some(d => d.status === "rejected");
  const allAccepted = docs.length > 0 && docs.every(d => d.status === "accepted");

  if (!anyUploaded) return "Requires Docs";
  if (anyRejected) return "Requires Docs";
  if (allAccepted && (current === "In Review" || current === "Requires Docs" || current === "New"))
    return "Ready for Lenders";
  return current;
}