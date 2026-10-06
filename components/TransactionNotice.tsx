"use client";

import { useState } from "react";
import { EXPLORER_URL } from "@/lib/constants";
import { getTransaction, monitorTransaction, type TransactionRecord } from "@/lib/genlayer";
import type { TxPhase } from "@/lib/types";

export function TransactionNotice({ hash, label, onFinalized, onPhase }: { hash: string; label: string; onFinalized?: () => void; onPhase?: (phase: TxPhase) => void }) {
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
  return <div className="txNotice panel">
    <div className="eyebrow">Transaction receipt</div>
    <strong>{label}</strong>
    <p className="mono">{hash}</p>
    {record ? <p className="muted"><strong>{record.phase}</strong> · protocol {record.protocolStatus}{record.executionStatus ? ` · execution ${record.executionStatus}` : ""}</p> : <p className="muted">Submitted hash saved. Consensus and finality are read from GenLayer, never inferred locally.</p>}
    {record?.phase === "ACCEPTED_PROVISIONAL" && <p className="warning">GenLayer accepted the transaction provisionally. The product state is not confirmed until finalization and canonical readback.</p>}
    {record?.phase === "UNDETERMINED" && <p className="error">Consensus was not reached. No milestone result was recorded. Reconcile this exact hash; do not rebroadcast automatically.</p>}
    <div className="row"><a className="button secondary" href={`${EXPLORER_URL}/tx/${hash}`} target="_blank" rel="noreferrer">Open explorer</a><button onClick={refreshOnce}>Refresh receipt</button><button className="secondary" disabled={loading} onClick={reconcile}>{loading ? "Monitoring…" : "Monitor to finality"}</button></div>
    {error && <p className="error">{error}</p>}
  </div>;
}
