"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { writeContract } from "@/lib/genlayer";
import { requestAccounts, currentChainId } from "@/lib/wallet";
import { CHAIN_ID } from "@/lib/constants";
import { TransactionNotice } from "@/components/TransactionNotice";
type CriterionDraft = { text: string; required: boolean };
const blank = (): CriterionDraft => ({ text: "", required: true });
export default function NewWork() {
  const [performer, setPerformer] = useState(""); const [title, setTitle] = useState(""); const [summary, setSummary] = useState(""); const [criteria, setCriteria] = useState<CriterionDraft[]>([blank(), blank()]);
  const [proposalDeadline, setProposalDeadline] = useState(""); const [deliveryDeadline, setDeliveryDeadline] = useState(""); const [hash, setHash] = useState(""); const [error, setError] = useState("");
  const [now] = useState(() => Math.floor(Date.now() / 1000));
  const validation = useMemo(() => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(performer)) return "Enter a valid 20-byte performer wallet address.";
    if (title.trim().length < 4 || title.trim().length > 120) return "Title must be 4–120 characters.";
    if (summary.trim().length < 12 || summary.trim().length > 1200) return "Summary must be 12–1200 characters.";
    if (criteria.length < 2 || criteria.length > 7) return "Use 2–7 criteria.";
    if (criteria.some((c) => c.text.trim().length < 8 || c.text.trim().length > 420)) return "Each criterion must be 8–420 characters.";
    if (criteria.filter((c) => c.required).length === 0) return "At least one criterion must be required.";
    const proposal = Date.parse(proposalDeadline) / 1000; const delivery = Date.parse(deliveryDeadline) / 1000;
    if (!Number.isFinite(proposal) || proposal <= now) return "Proposal deadline must be in the future.";
    if (!Number.isFinite(delivery) || delivery <= proposal) return "Delivery deadline must follow the proposal deadline.";
    return "";
  }, [performer, title, summary, criteria, proposalDeadline, deliveryDeadline, now]);
  function updateCriterion(index: number, patch: Partial<CriterionDraft>) { setCriteria((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item)); }
  async function submit(event: React.FormEvent) { event.preventDefault(); setError(""); if (validation) { setError(validation); return; } try { const accounts = await requestAccounts(); if (await currentChainId() !== CHAIN_ID) throw new Error("Switch your wallet to GenLayer Studionet 61999 before signing."); const proposal = Math.floor(Date.parse(proposalDeadline) / 1000); const delivery = Math.floor(Date.parse(deliveryDeadline) / 1000); const tx = await writeContract("create_engagement", [performer, title.trim(), summary.trim(), criteria.map((c) => c.text.trim()), criteria.map((c) => c.required), proposal, delivery], accounts[0], window.ethereum!); setHash(tx); } catch (e) { setError(e instanceof Error ? e.message : "The proposal transaction failed or was rejected."); } }
  return <section className="doc"><div className="eyebrow">New engagement</div><h1>Define the acceptance line.</h1><p className="muted">Creating the proposal signs the exact frozen terms. The performer will review these same criteria before accepting.</p>{hash && <TransactionNotice hash={hash} label="Create engagement" />}<form className="form" onSubmit={submit}><label className="field">Performer wallet<input value={performer} onChange={(e) => setPerformer(e.target.value)} placeholder="0x…" autoComplete="off" /></label><label className="field">Milestone title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ship the production analytics view" /></label><label className="field">Milestone summary<textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Describe the delivered outcome, not implementation instructions." /></label><div className="criteria"><div className="row sectionRow"><h2 className="sectionTitle">Acceptance criteria</h2><span className="muted">{criteria.length}/7</span></div>{criteria.map((criterion, index) => <article className="criterion" key={index}><div className="row criterionHead"><h3>Criterion {index + 1}</h3><label className="check"><input type="checkbox" checked={criterion.required} onChange={(e) => updateCriterion(index, { required: e.target.checked })} /> Required</label>{criteria.length > 2 && <button type="button" className="textButton" onClick={() => setCriteria((items) => items.filter((_, i) => i !== index))}>Remove</button>}</div><textarea value={criterion.text} onChange={(e) => updateCriterion(index, { text: e.target.value })} placeholder="State the observable condition that proves this milestone is done." /></article>)}{criteria.length < 7 && <button type="button" className="secondary" onClick={() => setCriteria((items) => [...items, blank()])}>Add criterion</button>}</div><div className="deadlineGrid"><label className="field">Proposal deadline<input type="datetime-local" value={proposalDeadline} onChange={(e) => setProposalDeadline(e.target.value)} /></label><label className="field">Delivery deadline<input type="datetime-local" value={deliveryDeadline} onChange={(e) => setDeliveryDeadline(e.target.value)} /></label></div>{validation && <p className="error">{validation}</p>}{error && <p className="error">{error}</p>}<div className="row"><button type="submit">Create proposal</button><Link className="button secondary" href="/work">Cancel</Link></div></form></section>;
}
