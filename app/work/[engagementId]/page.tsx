"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readContract, writeContract } from "@/lib/genlayer";
import { useWallet } from "@/components/WalletContext";
import type { Closure, Engagement, TxPhase } from "@/lib/types";
import { formatGenAmount, parseGenAmount } from "@/lib/money";
import { TransactionNotice } from "@/components/TransactionNotice";
import { StatusPill } from "@/components/StatusPill";

const stateCopy: Record<string, string> = {
  PROPOSED: "Waiting for the performer to accept the frozen terms.",
  ACTIVE: "The milestone is live. Evidence can be submitted against these terms.",
  COMPLETED: "The required criteria were accepted by the validator decision vector.",
  DECLINED: "The designated performer declined this proposal.",
  CANCELLED: "The requester cancelled this proposal before acceptance.",
  EXPIRED: "The active deadline passed without a valid next state.",
  CLOSED: "Both parties approved closure and the agreed settlement transfers were emitted.",
};

function date(value: number) {
  return new Date(value * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function gen(value: number | string | bigint) {
  try { return formatGenAmount(value); } catch { return "0"; }
}

export default function EngagementPage({ params }: { params: Promise<{ engagementId: string }> }) {
  const { account, connect } = useWallet();
  const [engagementId, setEngagementId] = useState("");
  const [item, setItem] = useState<Engagement | null>(null);
  const [closure, setClosure] = useState<Closure | null>(null);
  const [hash, setHash] = useState("");
  const [error, setError] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const [actionLabel, setActionLabel] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [challengeCriterion, setChallengeCriterion] = useState("0");
  const [challengeEvidence, setChallengeEvidence] = useState("[]");
  const [closureRequesterAmount, setClosureRequesterAmount] = useState("0");
  const [closurePerformerAmount, setClosurePerformerAmount] = useState("0");
  const [closureNonce, setClosureNonce] = useState("1");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function load(id: string) {
    const next = await readContract<Engagement>("get_engagement", [id]);
    setItem(next);
    const currentClosure = await readContract<Closure & { status: "NONE" }>("get_closure", [id]).catch(() => null);
    setClosure(currentClosure && ["OPEN", "EXECUTED"].includes(currentClosure.status) ? currentClosure : null);
    return next;
  }

  useEffect(() => {
    let active = true;
    params.then(({ engagementId: id }) => {
      if (!active) return;
      setEngagementId(id);
      void load(id).catch((e) => setError(e instanceof Error ? e.message : "Could not load this engagement."));
    });
    return () => { active = false; };
  }, [params]);

  async function action(name: string, args: unknown[] = [engagementId]) {
    if (actionPending) return;
    setError("");
    setActionPending(true);
    setPendingAction(name);
    setActionLabel(name.replaceAll("_", " "));
    try {
      const accounts = account ? [account] : await connect();
      if (!accounts[0]) throw new Error("Connect the wallet before signing this action.");
      const tx = await writeContract(name, args, accounts[0], window.ethereum!);
      setHash(tx);
    } catch (e) {
      setActionPending(false);
      setPendingAction("");
      setError(e instanceof Error ? e.message : "Transaction failed or was rejected.");
    }
  }

  function onPhase(phase: TxPhase) {
    if (["FAILED", "UNDETERMINED", "CANCELED", "MONITORING_STOPPED"].includes(phase)) {
      setActionPending(false);
      setPendingAction("");
    }
  }

  async function finalized() {
    const next = await load(engagementId);
    const expected: Record<string, string> = {
      accept_engagement: "ACTIVE",
      decline_engagement: "DECLINED",
      cancel_proposal: "CANCELLED",
      close_expired: "EXPIRED",
      approve_closure: "CLOSED",
    };
    if (pendingAction && expected[pendingAction] && next.status !== expected[pendingAction]) {
      throw new Error("Transaction finalized, but canonical state could not yet be verified. Reconcile this exact hash before retrying.");
    }
    setActionPending(false);
    setPendingAction("");
  }

  if (!item) {
    return <section className="doc"><div className="eyebrow">Engagement {engagementId || "…"}</div><h1>Milestone workspace</h1>{error ? <p className="error">{error}</p> : <p className="muted">Reading canonical terms from Studionet…</p>}</section>;
  }

  const currentAccount = account?.toLowerCase() || "";
  const requester = item.requester.toLowerCase() === currentAccount;
  const performer = item.performer.toLowerCase() === currentAccount;
  const disabled = actionPending;
  const challengeOpen = item.status === "COMPLETED" && item.settlement_state === "CHALLENGE_WINDOW" && now <= item.challenge_deadline;
  const canWithdraw = performer && item.status === "COMPLETED" && ["CHALLENGE_WINDOW", "CLAIMABLE"].includes(item.settlement_state) && now > item.challenge_deadline;
  const canClose = (item.status === "ACTIVE" || item.status === "COMPLETED") && !closure && !["PAYOUT_TRANSFER_PENDING", "REFUND_TRANSFER_PENDING", "CLOSURE_TRANSFER_PENDING"].includes(item.settlement_state);
  const hasOpenClosure = Boolean(closure && closure.status === "OPEN");
  const closureTransferPending = Boolean(closure && closure.status === "EXECUTED" && item.settlement_state === "CLOSURE_TRANSFER_PENDING");
  const closureDigest = closure?.digest || "";
  const needsRequesterApproval = hasOpenClosure && !closure?.requester_approved && requester;
  const needsPerformerApproval = hasOpenClosure && !closure?.performer_approved && performer;
  const needsRequesterTransferConfirmation = closureTransferPending && !closure?.requester_transfer_confirmed && requester;
  const needsPerformerTransferConfirmation = closureTransferPending && !closure?.performer_transfer_confirmed && performer;
  const closureExpired = hasOpenClosure && Boolean(closure?.closure_deadline && now > closure.closure_deadline);

  return <div className="workspace">
    <section className="doc">
      <div className="eyebrow">Agreement board · engagement {item.id}</div>
      <div className="titleRow"><div><h1>{item.title}</h1><p className="lede">{item.summary}</p></div><StatusPill>{item.status}</StatusPill></div>
      <div className="acceptanceLine"><span className="acceptanceNode">{requester ? "You · requester" : "Requester"}</span><span className="acceptanceRule" aria-hidden="true" /><span className="acceptanceNode">{performer ? "You · performer" : "Performer"}</span></div>
      <p className="panel stateNote"><strong>{stateCopy[item.status] || "Canonical engagement state."}</strong><br /><span className="muted">Product outcome and GenLayer transaction lifecycle remain separate.</span></p>

      <div className="sectionRow row"><h2 className="sectionTitle">Settlement ledger</h2><span className="pill">{item.settlement_state}</span></div>
      <div className="technicalGrid ledgerGrid">
        <span>Escrow funded <strong>{gen(item.escrow_amount)} GEN</strong></span>
        <span>Held <strong>{gen(item.held_amount)} GEN</strong></span>
        <span>Claimable <strong>{gen(item.claimable_amount)} GEN</strong></span>
        <span>Withdrawn <strong>{gen(item.withdrawn_amount)} GEN</strong></span>
        <span>Refunded <strong>{gen(item.refunded_amount)} GEN</strong></span>
        <span>Requester transfer pending <strong>{gen(item.pending_requester_amount)} GEN</strong></span>
        <span>Performer transfer pending <strong>{gen(item.pending_performer_amount)} GEN</strong></span>
        <span>Challenge window <strong>{item.challenge_deadline ? (now <= item.challenge_deadline ? `${Math.max(0, item.challenge_deadline - now)}s remaining` : "closed") : "not started"}</strong></span>
      </div>

      <div className="sectionRow row"><h2 className="sectionTitle">Frozen criteria</h2><span className="muted">{item.criteria.length} terms · {item.criteria.filter((criterion) => criterion.required).length} required</span></div>
      <div className="criteria">{item.criteria.map((criterion) => <article className="criterion" key={criterion.index}><div className="row criterionHead"><div><span className="eyebrow">Criterion {String(criterion.index + 1).padStart(2, "0")}</span><h3>{criterion.text}</h3></div><span className="pill">{criterion.required ? "Required" : "Supporting"}</span></div><p className="muted">Evidence attached to this sheet is judged only against this wording.</p></article>)}</div>

      <details className="technicalDetails"><summary>Integrity and policy details</summary><div className="digest"><span className="muted">Frozen terms digest</span><code>{item.terms_digest}</code></div><div className="technicalGrid"><span>Created <strong>{date(item.created_at)}</strong></span><span>Accepted <strong>{item.accepted_at ? date(item.accepted_at) : "Not yet"}</strong></span><span>Attempts <strong>{item.attempt_count}</strong></span><span>Challenges <strong>{item.challenge_count}</strong></span><span>Latest result <strong>{item.latest_result || "None"}</strong></span><span>Policy <strong>{item.evidence_policy_json}</strong></span></div></details>

      {challengeOpen && <div className="panel actionPanel"><div className="eyebrow">Challenge window</div><h3>Contest a completed result</h3><p className="muted">Submit a fresh, policy-compliant evidence set before the challenge deadline. The validator can uphold, reject, or mark the challenge inconclusive.</p><div className="deadlineGrid"><label className="field">Criterion index<input value={challengeCriterion} onChange={(e) => setChallengeCriterion(e.target.value)} inputMode="numeric" /></label><label className="field">Evidence JSON<textarea value={challengeEvidence} onChange={(e) => setChallengeEvidence(e.target.value)} /></label></div><button disabled={disabled || (!requester && !performer)} onClick={() => void action("challenge_attempt", [engagementId, item.attempt_count, Number(challengeCriterion), challengeEvidence])}>Submit challenge</button></div>}

      {canClose && <div className="panel actionPanel"><div className="eyebrow">Mutual closure</div><h3>Agree the final settlement</h3><p className="muted">Both parties must approve the exact GEN allocation. The amounts must equal all currently held and claimable funds.</p><div className="deadlineGrid"><label className="field">Requester share (GEN)<input value={closureRequesterAmount} onChange={(e) => setClosureRequesterAmount(e.target.value)} inputMode="decimal" /></label><label className="field">Performer share (GEN)<input value={closurePerformerAmount} onChange={(e) => setClosurePerformerAmount(e.target.value)} inputMode="decimal" /></label></div><label className="field">Closure nonce<input value={closureNonce} onChange={(e) => setClosureNonce(e.target.value)} inputMode="numeric" /></label><button disabled={disabled} onClick={() => { try { void action("request_closure", [engagementId, parseGenAmount(closureRequesterAmount), parseGenAmount(closurePerformerAmount), BigInt(closureNonce)]); } catch (e) { setError(e instanceof Error ? e.message : "Enter valid settlement amounts."); } }}>Request mutual closure</button></div>}

      {hasOpenClosure && <div className="panel actionPanel"><div className="eyebrow">Closure approval</div><h3>Review and sign the exact settlement</h3><p className="muted">Digest <code>{closureDigest}</code></p><p>Requester: <strong>{closure?.requester_approved ? "approved" : "waiting"}</strong> · Performer: <strong>{closure?.performer_approved ? "approved" : "waiting"}</strong></p><p className="muted">This proposal restores <strong>{closure?.previous_settlement_state}</strong> if cancelled or expired. Closure window: <strong>{closureExpired ? "expired" : `${Math.max(0, (closure?.closure_deadline || now) - now)}s remaining`}</strong>.</p>{(needsRequesterApproval || needsPerformerApproval) && !closureExpired && <button disabled={disabled} onClick={() => void action("approve_closure", [engagementId, closureDigest])}>Sign closure approval</button>}<div className="cta">{!closureExpired && <button className="secondary" disabled={disabled} onClick={() => void action("cancel_closure")}>Cancel closure proposal</button>}{closureExpired && <button className="secondary" disabled={disabled} onClick={() => void action("expire_closure")}>Expire closure and restore state</button>}</div></div>}
      {closureTransferPending && <div className="panel actionPanel"><div className="eyebrow">Transfer confirmation</div><h3>Confirm the settlement transfer you received</h3><p className="muted">The contract emitted the agreed transfer and keeps both amounts pending until each recipient confirms the exact transfer.</p><p>Requester transfer: <strong>{closure?.requester_transfer_confirmed ? "confirmed" : "pending"}</strong> · Performer transfer: <strong>{closure?.performer_transfer_confirmed ? "confirmed" : "pending"}</strong></p>{(needsRequesterTransferConfirmation || needsPerformerTransferConfirmation) && <button disabled={disabled} onClick={() => void action("confirm_closure_transfer")}>Confirm my closure transfer</button>}</div>}

      <div className="cta workspaceActions">
        {performer && item.status === "PROPOSED" && <><button disabled={disabled} onClick={() => void action("accept_engagement")}>{disabled && actionLabel === "accept engagement" ? "Signing…" : "Accept frozen terms"}</button><button disabled={disabled} className="secondary" onClick={() => void action("decline_engagement")}>{disabled && actionLabel === "decline engagement" ? "Signing…" : "Decline"}</button></>}
        {requester && item.status === "PROPOSED" && <button disabled={disabled} className="secondary" onClick={() => void action("cancel_proposal")}>{disabled && actionLabel === "cancel proposal" ? "Signing…" : "Cancel proposal / refund"}</button>}
        {item.status === "ACTIVE" && performer && <Link className="button lemon" href={`/work/${item.id}/submit`}>Submit evidence</Link>}
        {canWithdraw && <button disabled={disabled} onClick={() => void action("withdraw_performer")}>Withdraw performer payout</button>}
        {performer && item.settlement_state === "PAYOUT_TRANSFER_PENDING" && item.pending_performer_amount > 0 && <button disabled={disabled} onClick={() => void action("confirm_performer_payout")}>Confirm performer payout</button>}
        {requester && item.settlement_state === "REFUND_TRANSFER_PENDING" && item.pending_requester_amount > 0 && <button disabled={disabled} onClick={() => void action("confirm_refund")}>Confirm requester refund</button>}
        {(item.status === "PROPOSED" || item.status === "ACTIVE") && <button disabled={disabled} className="secondary" onClick={() => void action("close_expired")}>{disabled && actionLabel === "close expired" ? "Signing…" : "Close after deadline"}</button>}
        <Link className="button secondary" href={`/work/${item.id}/history`}>Open attempt ledger</Link>
      </div>

      {(hash || actionPending) && <TransactionNotice key={hash || "pending"} hash={hash} label={`Engagement action${actionPending && actionLabel ? ` · ${actionLabel}` : ""}`} awaitingSignature={actionPending && !hash} onPhase={onPhase} onFinalized={finalized} />}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
    <aside className="panel context"><div className="eyebrow">Receipt rail</div><h3>Agreement context</h3><p><strong>Requester</strong><br /><span className="mono">{item.requester}</span></p><p><strong>Performer</strong><br /><span className="mono">{item.performer}</span></p><p><strong>Proposal closes</strong><br />{date(item.proposal_deadline)}</p><p><strong>Delivery closes</strong><br />{date(item.delivery_deadline)}</p><div className="railMarker"><span>Current state</span><strong>{item.status}</strong></div><div className="railMarker"><span>Latest result</span><strong>{item.latest_result || "No attempt yet"}</strong></div></aside>
  </div>;
}
