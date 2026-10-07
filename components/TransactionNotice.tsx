"use client";

import { useState } from "react";
import { EXPLORER_URL } from "@/lib/constants";
import { getTransaction, monitorTransaction, type TransactionRecord } from "@/lib/genlayer";
import type { TxPhase } from "@/lib/types";

export function TransactionNotice({ hash, label, awaitingSignature = false, onFinalized, onPhase }: { hash: string; label: string; awaitingSignature?: boolean; onFinalized?: () => void; onPhase?: (phase: TxPhase) => void }) {
  const [record, setRecord] = useState<TransactionRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function reconcile() {
    setLoading(true); setError("");
    try {
      const next = await monitorTransaction(hash, (value) => { setRecord(value); onPhase?.(value.phase); }, { attempts: 40 });
      setRecord(next); onPhase?.(next.phase); if (next.phase === "FINALIZED") onFinalized?.();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not reconcile this transaction."); }
    finally { setLoading(false); }
  }
  async function refreshOnce() { try { const next = await getTransaction(hash); setRecord(next); onPhase?.(next.phase); } catch (e) { setError(e instanceof Error ? e.message : "Could not read this transaction."); } }
  const current = awaitingSignature && !record ? "AWAITING_SIGNATURE" : record?.phase || "SUBMITTED";
  const stages: Array<{ key: TxPhase; label: string }> = [{ key: "AWAITING_SIGNATURE", label: "Awaiting signature" }, { key: "SUBMITTED", label: "Submitted" }, { key: "CONSENSUS", label: "Consensus" }, { key: "ACCEPTED_PROVISIONAL", label: "Accepted provisional" }, { key: "FINALIZED", label: "Finalized" }, { key: "MONITORING_STOPPED", label: "Monitoring stopped" }];
  const stageIndex = current === "FAILED" || current === "CANCELED" ? 5 : Math.max(0, stages.findIndex((stage) => stage.key === current));
  return <div className="txNotice panel">
    <div className="eyebrow">Transaction receipt</div>
    <strong>{label}</strong>
    {hash ? <p className="mono">{hash}</p> : <p className="muted">No hash yet. Waiting for the wallet to approve this action.</p>}
    <div className="txRail" aria-label={`Transaction lifecycle: ${current}`}>{stages.map((stage, index) => <div className={`txStage ${current === stage.key ? "current" : index < stageIndex ? "done" : ""}`} key={stage.key}>{stage.label}</div>)}</div>
    {record ? <p className="receiptMeta muted"><strong>{record.phase}</strong><span>Protocol: {record.protocolStatus}{record.executionStatus ? ` · execution ${record.executionStatus}` : ""}</span></p> : <p className="muted">Submitted hash saved. Consensus and finality are read from GenLayer, never inferred locally.</p>}
    {record?.phase === "ACCEPTED_PROVISIONAL" && <p className="warning">GenLayer accepted the transaction provisionally. The product state is not confirmed until finalization and canonical readback.</p>}
    {record?.phase === "UNDETERMINED" && <p className="error">Consensus was not reached. No milestone result was recorded. Reconcile this exact hash; do not rebroadcast automatically.</p>}
    {record?.phase === "CANCELED" && <p className="error">The protocol canceled this transaction. No product state was inferred.</p>}
    {record?.phase === "FAILED" && <p className="error">Execution failed after protocol finalization. No successful product state was inferred.</p>}
    {record?.phase === "MONITORING_STOPPED" && <p className="warning">Monitoring stopped. This transaction may still be progressing. Reconcile this exact hash before retrying.</p>}
    <div className="row">{hash && <a className="button secondary" href={EXPLORER_URL + "/tx/" + hash} target="_blank" rel="noreferrer">Open explorer</a>}{hash && <button onClick={refreshOnce}>Refresh receipt</button>}{hash && <button className="secondary" disabled={loading} onClick={reconcile}>{loading ? "Monitoring…" : "Monitor to finality"}</button>}</div>
    {error && <p className="error">{error}</p>}
  </div>;
}
