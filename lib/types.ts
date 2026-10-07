export type Criterion = { index: number; text: string; required: boolean };
export type CriterionStatus = "MET" | "NOT_MET" | "UNVERIFIABLE";
export type ProductResult = "ACCEPTED" | "REVISION_REQUIRED" | "INCONCLUSIVE" | "";
export type EngagementStatus = "PROPOSED" | "ACTIVE" | "COMPLETED" | "DECLINED" | "CANCELLED" | "EXPIRED";
export type Engagement = {
  id: string; requester: string; performer: string; title: string; summary: string;
  criteria: Criterion[]; terms_digest: string; proposal_deadline: number; delivery_deadline: number;
  status: EngagementStatus; accepted_at: number; attempt_count: number; latest_result: ProductResult;
  completed_at: number; created_at: number;
};
export type EvidenceKind = "VERSIONED_SOURCE" | "TRANSACTION" | "PUBLIC_ARTIFACT" | "LIVE_DEPLOYMENT";
export type EvidenceRef = { criterion: number; kind: EvidenceKind; url: string; note?: string };
export type TxPhase = "IDLE" | "AWAITING_SIGNATURE" | "SUBMITTED" | "CONSENSUS" | "ACCEPTED_PROVISIONAL" | "FINALIZED" | "UNDETERMINED" | "CANCELED" | "MONITORING_STOPPED" | "FAILED";
export type Attempt = { number: number; submission_digest: string; evidence_json: string; result: Exclude<ProductResult, "">; decisions_json: string; submitted_at: number };
export type EngagementPage = { ids: string[]; next_offset: number; total: number; incoming_ids?: string[]; incoming_next_offset?: number; incoming_total?: number };
export type AttemptPage = { items: Attempt[]; next_offset: number; total: number };
