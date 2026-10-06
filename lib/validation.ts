import type { Criterion, CriterionStatus, EvidenceKind, EvidenceRef, ProductResult } from "@/lib/types";

export const MAX_EVIDENCE_PER_CRITERION = 2;
export const MAX_EVIDENCE_TOTAL = 10;
export const MAX_EVIDENCE_URL_CHARS = 600;
export const EVIDENCE_KINDS: EvidenceKind[] = ["VERSIONED_SOURCE", "TRANSACTION", "PUBLIC_ARTIFACT", "LIVE_DEPLOYMENT"];

export function deriveProductResult(criteria: Criterion[], statuses: Array<{ index: number; status: CriterionStatus }>): ProductResult {
  const byIndex = new Map(statuses.map((item) => [item.index, item.status]));
  if (criteria.some((criterion) => criterion.required && byIndex.get(criterion.index) === "NOT_MET")) return "REVISION_REQUIRED";
  if (criteria.some((criterion) => criterion.required && byIndex.get(criterion.index) === "UNVERIFIABLE")) return "INCONCLUSIVE";
  return "ACCEPTED";
}

export function validateEvidenceRefs(criteria: Criterion[], refs: EvidenceRef[]): string {
  if (refs.length < 1 || refs.length > MAX_EVIDENCE_TOTAL) return "Use 1–10 evidence references.";
  const known = new Set(criteria.map((criterion) => criterion.index));
  const counts = new Map<number, number>(); const identities = new Set<string>();
  for (const ref of refs) {
    if (!known.has(ref.criterion)) return "Evidence references an unknown criterion.";
    if (!EVIDENCE_KINDS.includes(ref.kind)) return "Evidence source kind is not supported.";
    if (!/^https:\/\/[^\s/?#]+(?:[/?][^\s#]*)?$/i.test(ref.url) || ref.url.length > MAX_EVIDENCE_URL_CHARS || ref.url.includes("#") || ref.url.includes("@")) return "Evidence must be a bounded HTTPS URL without credentials or fragments.";
    const lower = ref.url.toLowerCase();
    if (/(^|[/:])localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|169\.254\.|(^|https:\/\/)(10\.|172\.(1[6-9]|2\d|3[01])\.|\[f[cd])/i.test(lower)) return "Private or local evidence URLs are not allowed.";
    const count = (counts.get(ref.criterion) || 0) + 1; if (count > MAX_EVIDENCE_PER_CRITERION) return "Each criterion may have at most two evidence references."; counts.set(ref.criterion, count);
    const identity = `${ref.criterion}:${ref.kind}:${ref.url}`; if (identities.has(identity)) return "Duplicate evidence references are not allowed."; identities.add(identity);
  }
  return "";
}
