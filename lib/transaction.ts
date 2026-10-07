import type { TxPhase } from "@/lib/types";

export type RailKey = TxPhase | "CANONICAL_VERIFIED";
export const SUCCESS_STAGES: Array<{ key: RailKey; label: string }> = [
  { key: "AWAITING_SIGNATURE", label: "Awaiting signature" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "CONSENSUS", label: "Consensus" },
  { key: "ACCEPTED_PROVISIONAL", label: "Accepted provisional" },
  { key: "FINALIZED", label: "Finalized" },
  { key: "CANONICAL_VERIFIED", label: "Canonical state verified" },
];
export const FAILURE_PHASES = new Set<TxPhase>(["FAILED", "CANCELED", "UNDETERMINED", "MONITORING_STOPPED"]);

export function transactionRailState(phase: TxPhase, canonicalVerified: boolean): { terminalFailure: boolean; current: RailKey } {
  return { terminalFailure: FAILURE_PHASES.has(phase), current: canonicalVerified ? "CANONICAL_VERIFIED" : phase };
}
