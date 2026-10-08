import type { Attempt, AttemptPage, Criterion, Engagement, EvidenceRef, ProductResult } from "@/lib/types";
import { normalizeEvidenceUrl } from "@/lib/validation";
import { getAddress } from "viem";

export const CANONICAL_VERIFICATION_ERROR = "Transaction finalized, but canonical state could not yet be verified. Reconcile this exact hash before retrying.";

export type FrozenTerms = {
  requester: string;
  performer: string;
  title: string;
  summary: string;
  criteria: Criterion[];
  proposalDeadline: number;
  deliveryDeadline: number;
  evidencePolicyJson: string;
  challengeWindowSeconds: number;
  escrowAmountWei: string;
};

export function canonicalFrozenTerms(input: {
  requester: string;
  performer: string;
  title: string;
  summary: string;
  criteria: Array<{ text: string; required: boolean }>;
  proposalDeadline: number;
  deliveryDeadline: number;
  evidencePolicyJson?: string;
  challengeWindowSeconds?: number;
  escrowAmountWei?: string;
}): FrozenTerms {
  let policy = input.evidencePolicyJson?.trim() || '{"criteria":[],"version":1}';
  try { policy = canonicalJson(JSON.parse(policy)); } catch { /* the contract returns a clear validation error for malformed policy JSON */ }
  return {
    requester: getAddress(input.requester.trim()),
    performer: getAddress(input.performer.trim()),
    title: input.title.trim(),
    summary: input.summary.trim(),
    criteria: input.criteria.map((criterion, index) => ({ index, text: criterion.text.trim(), required: Boolean(criterion.required) })),
    proposalDeadline: Math.floor(input.proposalDeadline),
    deliveryDeadline: Math.floor(input.deliveryDeadline),
    evidencePolicyJson: policy,
    challengeWindowSeconds: Math.floor(input.challengeWindowSeconds || 3600),
    escrowAmountWei: input.escrowAmountWei || "0",
  };
}

function compareKeys(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function asciiJsonString(value: string): string {
  return JSON.stringify(value).replace(/[^\x00-\x7F]/g, (character) => {
    const code = character.charCodeAt(0);
    return `\\u${code.toString(16).padStart(4, "0")}`;
  });
}

export function canonicalJson(value: unknown): string {
  if (typeof value === "string") return asciiJsonString(value);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => compareKeys(left, right));
    return `{${entries.map(([key, item]) => `${asciiJsonString(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  throw new Error("Unsupported canonical JSON value");
}

export async function sha256Hex(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Canonical digest support is unavailable in this browser.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function computeTermsDigest(terms: FrozenTerms): Promise<string> {
  return sha256Hex(canonicalJson({
    requester: terms.requester,
    performer: terms.performer,
    title: terms.title,
    summary: terms.summary,
    criteria: terms.criteria,
    proposal_deadline: terms.proposalDeadline,
    delivery_deadline: terms.deliveryDeadline,
    evidence_policy_json: terms.evidencePolicyJson,
    challenge_window_seconds: terms.challengeWindowSeconds,
    escrow_amount: terms.escrowAmountWei,
  }));
}

export function frozenTermsMatch(engagement: Engagement, expected: FrozenTerms, expectedDigest?: string): boolean {
  const criteriaMatch = engagement.criteria.length === expected.criteria.length && expected.criteria.every((criterion, index) => {
    const actual = engagement.criteria[index];
    return actual?.index === criterion.index && actual.text === criterion.text && actual.required === criterion.required;
  });
  return engagement.requester.toLowerCase() === expected.requester.toLowerCase()
    && engagement.performer.toLowerCase() === expected.performer.toLowerCase()
    && engagement.title === expected.title
    && engagement.summary === expected.summary
    && criteriaMatch
    && engagement.proposal_deadline === expected.proposalDeadline
    && engagement.delivery_deadline === expected.deliveryDeadline
    && engagement.evidence_policy_json === expected.evidencePolicyJson
    && engagement.challenge_window_seconds === expected.challengeWindowSeconds
    && String(engagement.escrow_amount) === expected.escrowAmountWei
    && (!expectedDigest || engagement.terms_digest === expectedDigest)
    && engagement.status === "PROPOSED";
}

export type CanonicalEvidence = {
  criterion: number;
  kind: string;
  url: string;
  note: string;
};

function canonicalEvidenceSort(left: CanonicalEvidence, right: CanonicalEvidence): number {
  return left.criterion - right.criterion || compareKeys(left.kind, right.kind) || compareKeys(left.url, right.url);
}

export function canonicalEvidence(refs: EvidenceRef[]): { stored: CanonicalEvidence[]; semantic: Omit<CanonicalEvidence, "note">[]; storedJson: string; semanticJson: string } {
  const stored = refs.map((ref) => {
    const url = normalizeEvidenceUrl(ref.url);
    if (!url) throw new Error("Evidence could not be canonically normalized.");
    return { criterion: ref.criterion, kind: ref.kind.trim().toUpperCase(), url, note: (ref.note || "").trim() };
  }).sort(canonicalEvidenceSort);
  const semantic = stored.map(({ criterion, kind, url }) => ({ criterion, kind, url }));
  return { stored, semantic, storedJson: canonicalJson(stored), semanticJson: canonicalJson(semantic) };
}

export async function computeSubmissionDigest(engagementId: string, termsDigest: string, refs: EvidenceRef[]): Promise<{ digest: string; storedJson: string; semanticJson: string }> {
  const canonical = canonicalEvidence(refs);
  const digest = await sha256Hex(`${engagementId}:${termsDigest}:${canonical.semanticJson}`);
  return { digest, storedJson: canonical.storedJson, semanticJson: canonical.semanticJson };
}

export function expectedStatusForResult(result: ProductResult): Engagement["status"] {
  return result === "ACCEPTED" ? "COMPLETED" : "ACTIVE";
}

export function canSubmitEvidence(engagement: Pick<Engagement, "status">): boolean {
  return engagement.status === "ACTIVE";
}

export function attemptIdentityMatches(attempt: Attempt, expectedDigest: string, expectedEvidenceJson: string): boolean {
  return attempt.submission_digest === expectedDigest && attempt.evidence_json === expectedEvidenceJson;
}

export function attemptStateIsConsistent(engagement: Engagement, attempt: Attempt): boolean {
  const isLatestAttempt = attempt.number === engagement.attempt_count;
  if (attempt.result === "ACCEPTED") return isLatestAttempt && engagement.status === "COMPLETED" && engagement.latest_result === "ACCEPTED";
  if (attempt.result !== "REVISION_REQUIRED" && attempt.result !== "INCONCLUSIVE") return false;
  if (isLatestAttempt) {
    return (engagement.status === "ACTIVE" || engagement.status === "EXPIRED")
      && engagement.latest_result === attempt.result;
  }
  return engagement.status === "ACTIVE" || engagement.status === "COMPLETED" || engagement.status === "EXPIRED";
}

export function canonicalAttemptMatch(input: {
  engagement: Engagement;
  attempt: Attempt | undefined;
  expectedDigest: string;
  expectedEvidenceJson: string;
}): boolean {
  if (!input.attempt || !attemptIdentityMatches(input.attempt, input.expectedDigest, input.expectedEvidenceJson)) return false;
  return attemptStateIsConsistent(input.engagement, input.attempt);
}

export async function findCanonicalAttemptAfterBaseline(input: {
  baselineAttemptCount: number;
  currentAttemptCount: number;
  expectedDigest: string;
  expectedEvidenceJson: string;
  readPage: (offset: number, limit: number) => Promise<AttemptPage>;
  pageSize?: number;
}): Promise<Attempt | null> {
  const pageSize = Math.max(1, Math.min(20, Math.floor(input.pageSize || 20)));
  const baseline = Math.max(0, Math.floor(input.baselineAttemptCount));
  const current = Math.max(0, Math.floor(input.currentAttemptCount));
  if (current <= baseline) return null;
  let offset = Math.floor(baseline / pageSize) * pageSize;
  const matches: Attempt[] = [];
  while (offset < current) {
    const page = await input.readPage(offset, pageSize);
    for (const attempt of page.items || []) {
      if (attempt.number > baseline && attempt.number <= current && attemptIdentityMatches(attempt, input.expectedDigest, input.expectedEvidenceJson)) matches.push(attempt);
    }
    if (matches.length > 1 || !page.items?.length || !page.next_offset) break;
    offset = page.next_offset;
  }
  return matches.length === 1 ? matches[0] : null;
}
