"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readContract, writeContract } from "@/lib/genlayer";
import { useWallet } from "@/components/WalletContext";
import type { Engagement, TxPhase } from "@/lib/types";
import { TransactionNotice } from "@/components/TransactionNotice";
import { StatusPill } from "@/components/StatusPill";

const stateCopy: Record<string, string> = { PROPOSED: "Waiting for the performer to accept the frozen terms.", ACTIVE: "The milestone is live. Evidence can be submitted against these terms.", COMPLETED: "The required criteria were accepted by the validator decision vector.", DECLINED: "The designated performer declined this proposal.", CANCELLED: "The requester cancelled this proposal before acceptance.", EXPIRED: "The active deadline passed without a valid next state." };
function date(value: number) { return new Date(value * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }

export default function EngagementPage({ params }: { params: Promise<{ engagementId: string }> }) {
  const { account, connect } = useWallet();
  const [engagementId, setEngagementId] = useState("");
  const [item, setItem] = useState<Engagement | null>(null);
  const [hash, setHash] = useState("");
  const [error, setError] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const [actionLabel, setActionLabel] = useState("");

  async function load(id: string) {
    try { setItem(await readContract<Engagement>("get_engagement", [id])); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load this engagement."); }
  }
  useEffect(() => { let active = true; params.then(({ engagementId: id }) => { if (active) { setEngagementId(id); void load(id); } }); return () => { active = false; }; }, [params]);

  async function action(name: string) {
    if (actionPending) return;
    setError(""); setActionPending(true); setActionLabel(name.replaceAll("_", " "));
    try {
      const accounts = account ? [account] : await connect();
      if (!accounts[0]) throw new Error("Connect the wallet before signing this action.");
      const tx = await writeContract(name, [engagementId], accounts[0], window.ethereum!);
      setHash(tx);
    } catch (e) {
      setActionPending(false);
      setError(e instanceof Error ? e.message : "Transaction failed or was rejected.");
    }
  }
  function onPhase(phase: TxPhase) {
    if (["FINALIZED", "FAILED", "UNDETERMINED", "CANCELED", "MONITORING_STOPPED"].includes(phase)) setActionPending(false);
  }
  async function finalized() { await load(engagementId); setActionPending(false); }

  if (!item) return <section className="doc"><div className="eyebrow">Engagement {engagementId || "…"}</div><h1>Milestone workspace</h1>{error ? <p className="error">{error}</p> : <p className="muted">Reading canonical terms from Studionet…</p>}</section>;
  const requester = item.requester.toLowerCase() === account.toLowerCase();
  const performer = item.performer.toLowerCase() === account.toLowerCase();
  const disabled = actionPending;
  return <div className="workspace"><section className="doc"><div className="eyebrow">Agreement board · engagement {item.id}</div><div className="titleRow"><div><h1>{item.title}</h1><p className="lede">{item.summary}</p></div><StatusPill>{item.status}</StatusPill></div><div className="acceptanceLine"><span className="acceptanceNode">{requester ? "You · requester" : "Requester"}</span><span className="acceptanceRule" aria-hidden="true" /><span className="acceptanceNode">{performer ? "You · performer" : "Performer"}</span></div><p className="panel stateNote"><strong>{stateCopy[item.status] || "Canonical engagement state."}</strong><br /><span className="muted">Product outcome and GenLayer transaction lifecycle remain separate.</span></p><div className="sectionRow row"><h2 className="sectionTitle">Frozen criteria</h2><span className="muted">{item.criteria.length} terms · {item.criteria.filter((criterion) => criterion.required).length} required</span></div><div className="criteria">{item.criteria.map((criterion) => <article className="criterion" key={criterion.index}><div className="row criterionHead"><div><span className="eyebrow">Criterion {String(criterion.index + 1).padStart(2, "0")}</span><h3>{criterion.text}</h3></div><span className="pill">{criterion.required ? "Required" : "Supporting"}</span></div><p className="muted">Evidence attached to this sheet is judged only against this wording.</p></article>)}</div><details className="technicalDetails"><summary>Integrity details</summary><div className="digest"><span className="muted">Frozen terms digest</span><code>{item.terms_digest}</code></div><div className="technicalGrid"><span>Created <strong>{date(item.created_at)}</strong></span><span>Accepted <strong>{item.accepted_at ? date(item.accepted_at) : "Not yet"}</strong></span><span>Attempts <strong>{item.attempt_count}</strong></span><span>Latest result <strong>{item.latest_result || "None"}</strong></span></div></details><div className="cta workspaceActions">{performer && item.status === "PROPOSED" && <><button disabled={disabled} onClick={() => void action("accept_engagement")}>{disabled && actionLabel === "accept engagement" ? "Signing…" : "Accept frozen terms"}</button><button disabled={disabled} className="secondary" onClick={() => void action("decline_engagement")}>{disabled && actionLabel === "decline engagement" ? "Signing…" : "Decline"}</button></>}{requester && item.status === "PROPOSED" && <button disabled={disabled} className="secondary" onClick={() => void action("cancel_proposal")}>{disabled && actionLabel === "cancel proposal" ? "Signing…" : "Cancel proposal"}</button>}{item.status === "ACTIVE" && performer && <Link className="button lemon" href={"/work/" + item.id + "/submit"}>Submit evidence</Link>}{(item.status === "PROPOSED" || item.status === "ACTIVE") && <button disabled={disabled} className="secondary" onClick={() => void action("close_expired")}>{disabled && actionLabel === "close expired" ? "Signing…" : "Close after deadline"}</button>}<Link className="button secondary" href={"/work/" + item.id + "/history"}>Open attempt ledger</Link></div>{(hash || actionPending) && <TransactionNotice hash={hash} label={"Engagement action" + (actionPending && actionLabel ? " · " + actionLabel : "")} awaitingSignature={actionPending && !hash} onPhase={onPhase} onFinalized={finalized} />}{error && <p className="error" role="alert">{error}</p>}</section><aside className="panel context"><div className="eyebrow">Receipt rail</div><h3>Agreement context</h3><p><strong>Requester</strong><br /><span className="mono">{item.requester}</span></p><p><strong>Performer</strong><br /><span className="mono">{item.performer}</span></p><p><strong>Proposal closes</strong><br />{date(item.proposal_deadline)}</p><p><strong>Delivery closes</strong><br />{date(item.delivery_deadline)}</p><div className="railMarker"><span>Current state</span><strong>{item.status}</strong></div><div className="railMarker"><span>Latest result</span><strong>{item.latest_result || "No attempt yet"}</strong></div></aside></div>;
}
