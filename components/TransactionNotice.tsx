"use client";

import { useState } from "react";
import { EXPLORER_URL } from "@/lib/constants";
import { getTransaction, monitorTransaction, type TransactionRecord } from "@/lib/genlayer";
import type { TxPhase } from "@/lib/types";
import { SUCCESS_STAGES, transactionRailState } from "@/lib/transaction";

type Props = {
  hash: string;
  label: string;
  awaitingSignature?: boolean;
  onFinalized?: () => Promise<void> | void;
  onPhase?: (phase: TxPhase) => void;
};


function failureMessage(phase: TxPhase) {
  if (phase === "CANCELED") return "The protocol canceled this transaction. No product state was inferred.";
  if (phase === "FAILED") return "Execution failed after protocol finalization. No successful product state was inferred.";
  if (phase === "UNDETERMINED") return "Consensus was not reached. No milestone result was recorded. Reconcile this exact hash; do not rebroadcast automatically.";
  return "Monitoring stopped before a terminal result. Reconcile this exact hash before retrying.";
}

export function TransactionNotice({ hash, label, onFinalized, onPhase }: Props) {
  const [record, setRecord] = useState<TransactionRecord | null>(null);
  const [canonicalVerified, setCanonicalVerified] = useState(false);
  const [canonicalPending, setCanonicalPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function publish(next: TransactionRecord) {
    setRecord(next);
    onPhase?.(next.phase);
  }

  async function publishTerminal(next: TransactionRecord) {
    publish(next);
    if (next.phase !== "FINALIZED") return;
    if (!onFinalized) {
      setCanonicalVerified(false);
      return;
    }
    setCanonicalPending(true);
    setCanonicalVerified(false);
    try {
      await onFinalized();
      setCanonicalVerified(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction finalized, but canonical state could not yet be verified. Reconcile this exact hash before retrying.");
    } finally {
      setCanonicalPending(false);
    }
  }

  async function reconcile() {
    setLoading(true); setError("");
    try {
      const next = await monitorTransaction(hash, (value) => { if (value.phase !== "FINALIZED") publish(value); }, { attempts: 40 });
      await publishTerminal(next);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not reconcile this transaction."); }
    finally { setLoading(false); }
  }

  async function refreshOnce() {
    setLoading(true); setError("");
    try { await publishTerminal(await getTransaction(hash)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not read this transaction."); }
    finally { setLoading(false); }
  }

  const protocolPhase = record?.phase || (hash ? "SUBMITTED" : "AWAITING_SIGNATURE");
  const rail = transactionRailState(protocolPhase, canonicalVerified);
  const current = rail.current;
  const isFailure = rail.terminalFailure;
  const currentIndex = SUCCESS_STAGES.findIndex((stage) => stage.key === current);

  return <div className="txNotice panel">
    <div className="eyebrow">Transaction receipt</div>
    <strong>{label}</strong>
    {hash ? <p className="mono">{hash}</p> : <p className="muted">No hash yet. Waiting for the wallet to approve this action.</p>}
    {isFailure ? <div className="txTerminal" role="status"><strong>{protocolPhase}</strong><p>{failureMessage(protocolPhase)}</p></div> : <div className="txRail" aria-label={`Transaction lifecycle: ${current}`}>{SUCCESS_STAGES.map((stage, index) => <div className={`txStage ${current === stage.key ? "current" : index < currentIndex ? "done" : ""}`} key={stage.key}>{stage.label}</div>)}</div>}
    {record ? <p className="receiptMeta muted"><strong>{record.phase}</strong><span>Protocol: {record.protocolStatus}{record.executionStatus ? ` · execution ${record.executionStatus}` : ""}</span></p> : <p className="muted">Submitted hash saved. Consensus and finality are read from GenLayer, never inferred locally.</p>}
    {canonicalPending && <p className="warning">Finalized. Reading the canonical Accordant state before confirming this action…</p>}
    {record?.phase === "FINALIZED" && !canonicalVerified && !canonicalPending && <p className="warning">Transaction finalized, but canonical state is not yet verified. Reconcile this exact hash before retrying.</p>}
    {record?.phase === "ACCEPTED_PROVISIONAL" && <p className="warning">GenLayer accepted the transaction provisionally. The product state is not confirmed until finalization and canonical readback.</p>}
    <div className="row">{hash && <a className="button secondary" href={EXPLORER_URL + "/tx/" + hash} target="_blank" rel="noreferrer">Open explorer</a>}{hash && <button onClick={() => { void refreshOnce(); }} disabled={loading}>Refresh receipt</button>}{hash && <button className="secondary" disabled={loading} onClick={() => { void reconcile(); }}>{loading ? "Reconciling…" : "Monitor to finality"}</button>}</div>
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
