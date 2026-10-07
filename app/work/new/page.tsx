"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { readContract, writeContract } from "@/lib/genlayer";
import { useWallet } from "@/components/WalletContext";
import { validatePerformerAddress } from "@/lib/validation";
import { TransactionNotice } from "@/components/TransactionNotice";
import type { Engagement, EngagementPage } from "@/lib/types";

type CriterionDraft = { text: string; required: boolean };
const blank = (): CriterionDraft => ({ text: "", required: true });

export default function NewWork() {
  const { account, connect } = useWallet();
  const [performer, setPerformer] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [criteria, setCriteria] = useState<CriterionDraft[]>([blank(), blank()]);
  const [proposalDeadline, setProposalDeadline] = useState("");
  const [deliveryDeadline, setDeliveryDeadline] = useState("");
  const [hash, setHash] = useState("");
  const [error, setError] = useState("");
  const [canonical, setCanonical] = useState("");
  const [signing, setSigning] = useState(false);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const pendingTerms = useRef<{ requester: string; performer: string; title: string; summary: string; proposal: number; delivery: number } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const validation = useMemo(() => {
    const performerError = validatePerformerAddress(performer);
    if (performerError) return performerError;
    if (title.trim().length < 4 || title.trim().length > 120) return "Title must be 4–120 characters.";
    if (summary.trim().length < 12 || summary.trim().length > 1200) return "Summary must be 12–1200 characters.";
    if (criteria.length < 2 || criteria.length > 7) return "Use 2–7 criteria.";
    const normalized = criteria.map((criterion) => criterion.text.trim().replace(/\s+/g, " ").toLowerCase());
    if (normalized.some((text) => text.length < 8 || text.length > 420)) return "Each criterion must be 8–420 characters.";
    if (new Set(normalized).size !== normalized.length) return "Criteria must be distinct.";
    if (criteria.filter((criterion) => criterion.required).length === 0) return "At least one criterion must be required.";
    const proposal = Date.parse(proposalDeadline) / 1000;
    const delivery = Date.parse(deliveryDeadline) / 1000;
    if (!Number.isFinite(proposal) || proposal <= now) return "Proposal deadline must be in the future.";
    if (!Number.isFinite(delivery) || delivery <= proposal) return "Delivery deadline must follow the proposal deadline.";
    return "";
  }, [performer, title, summary, criteria, proposalDeadline, deliveryDeadline, now]);

  function updateCriterion(index: number, patch: Partial<CriterionDraft>) { setCriteria((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item)); }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (signing) return;
    if (validation) { setError(validation); return; }
    setSigning(true);
    setCanonical("");
    try {
      const accounts = account ? [account] : await connect();
      if (!accounts[0]) throw new Error("Connect the requester wallet before signing the proposal.");
      const proposal = Math.floor(Date.parse(proposalDeadline) / 1000);
      const delivery = Math.floor(Date.parse(deliveryDeadline) / 1000);
      pendingTerms.current = { requester: accounts[0].toLowerCase(), performer: performer.trim().toLowerCase(), title: title.trim(), summary: summary.trim(), proposal, delivery };
      const tx = await writeContract("create_engagement", [performer.trim(), title.trim(), summary.trim(), criteria.map((c) => c.text.trim()), criteria.map((c) => c.required), proposal, delivery], accounts[0], window.ethereum!);
      setHash(tx);
    } catch (e) {
      setSigning(false);
      setError(e instanceof Error ? e.message : "The proposal transaction failed or was rejected.");
    }
  }

  function onPhase(phase: Parameters<NonNullable<React.ComponentProps<typeof TransactionNotice>["onPhase"]>>[0]) {
    if (["FAILED", "UNDETERMINED", "CANCELED", "MONITORING_STOPPED"].includes(phase)) setSigning(false);
  }

  async function confirmCanonicalCreation() {
    if (!pendingTerms.current) throw new Error("Transaction finalized, but canonical state could not yet be verified. Reconcile this exact hash before retrying.");
    const expected = pendingTerms.current;
    const first = await readContract<EngagementPage>("get_requester_engagements", [expected.requester, 0, 20]);
    const offset = Math.max(0, first.total - 20);
    const page = offset === 0 ? first : await readContract<EngagementPage>("get_requester_engagements", [expected.requester, offset, 20]);
    const candidates = await Promise.all((page.ids || []).map((id) => readContract<Engagement>("get_engagement", [String(id)])));
    const found = candidates.find((item) => item.requester.toLowerCase() === expected.requester && item.performer.toLowerCase() === expected.performer && item.title === expected.title && item.summary === expected.summary && item.proposal_deadline === expected.proposal && item.delivery_deadline === expected.delivery && item.status === "PROPOSED");
    if (!found) throw new Error("Transaction finalized, but canonical state could not yet be verified. Reconcile this exact hash before retrying.");
    setCanonical("Canonical state verified: proposal " + found.id + " is PROPOSED on Studionet.");
    setSigning(false);
  }

  return <section className="doc">
    <div className="eyebrow">New engagement · one-page composer</div>
    <h1>Define the acceptance line.</h1>
    <p className="lede">Creating the proposal signs the exact frozen terms. The performer will review these same criteria before accepting.</p>
    <div className="composeSteps" aria-label="One-page engagement composer"><span className="composeStep active">ONE-PAGE COMPOSER</span><span className="composeStep active">LIVE AGREEMENT PREVIEW</span></div>
    {(hash || signing) && <TransactionNotice key={hash || "pending"} hash={hash} label="Create engagement" awaitingSignature={signing && !hash} onPhase={onPhase} onFinalized={confirmCanonicalCreation} />}
    {canonical && <p className="success" role="status">{canonical}</p>}
    <div className="composeLayout">
      <form className="form" onSubmit={submit}>
        <label className="field">Performer wallet<span className="muted">The designated wallet that can accept and submit evidence.</span><input value={performer} onChange={(e) => setPerformer(e.target.value)} placeholder="0x…" autoComplete="off" /></label>
        <label className="field">Milestone title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Ship the production analytics view" /><span className="muted">{title.length}/120</span></label>
        <label className="field">Milestone summary<textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={1200} placeholder="Describe the delivered outcome, not implementation instructions." /><span className="muted">{summary.length}/1200</span></label>
        <div className="criteria"><div className="row sectionRow"><h2 className="sectionTitle">Acceptance criteria</h2><span className="muted">{criteria.length}/7</span></div><p className="muted">Write observable conditions. These terms become the shared reference point for the later evidence review.</p>{criteria.map((criterion, index) => <article className="criterion" key={index}><div className="row criterionHead"><h3>Criterion {String(index + 1).padStart(2, "0")}</h3><label className="check"><input type="checkbox" checked={criterion.required} onChange={(e) => updateCriterion(index, { required: e.target.checked })} /> Required</label>{criteria.length > 2 && <button type="button" className="textButton" onClick={() => setCriteria((items) => items.filter((_, i) => i !== index))}>Remove</button>}</div><textarea value={criterion.text} onChange={(e) => updateCriterion(index, { text: e.target.value })} maxLength={420} placeholder="State the observable condition that proves this milestone is done." /><div className="row" style={{ justifyContent: "space-between", marginTop: 7 }}><span className="muted">{criterion.text.length}/420 characters</span><span className="muted">{criterion.required ? "Required for acceptance" : "Supporting criterion"}</span></div></article>)}{criteria.length < 7 && <button type="button" className="secondary" onClick={() => setCriteria((items) => [...items, blank()])}>+ Add criterion</button>}</div>
        <div className="deadlineGrid"><label className="field">Proposal deadline<input type="datetime-local" value={proposalDeadline} onChange={(e) => setProposalDeadline(e.target.value)} /></label><label className="field">Delivery deadline<input type="datetime-local" value={deliveryDeadline} onChange={(e) => setDeliveryDeadline(e.target.value)} /></label></div>
        {validation && <p className="error" role="alert">{validation}</p>}{error && <p className="error" role="alert">{error}</p>}
        <div className="row"><button className="lemon" type="submit" disabled={signing}>{signing ? "Awaiting wallet signature…" : "Review & sign proposal"}</button><Link className="button secondary" href="/work">Cancel</Link></div>
      </form>
      <aside className="agreementPreview"><div className="eyebrow">Live agreement preview</div><h3>{title.trim() || "Your milestone title"}</h3><div className="previewLine"><span>Requester</span><strong>{account || "Connect wallet to sign"}</strong></div><div className="previewLine"><span>Performer</span><strong>{performer || "0x…"}</strong></div><div className="previewLine"><span>Frozen criteria</span><strong>{criteria.filter((criterion) => criterion.text.trim()).length} written · {criteria.filter((criterion) => criterion.required).length} required</strong></div><div className="previewLine"><span>Terms</span><strong>Signed together before delivery</strong></div><p className="muted">Signing freezes the people, wording, required flags and deadlines as one digest. No escrow or payout is involved.</p></aside>
    </div>
  </section>;
}
