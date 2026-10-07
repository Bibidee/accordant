"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { readContract, writeContract } from "@/lib/genlayer";
import { useWallet } from "@/components/WalletContext";
import type { AttemptPage, Engagement, EvidenceKind, EvidenceRef, TxPhase } from "@/lib/types";
import { validateEvidenceRefs } from "@/lib/validation";
import { TransactionNotice } from "@/components/TransactionNotice";
import { CANONICAL_VERIFICATION_ERROR, canSubmitEvidence, canonicalAttemptMatch, computeSubmissionDigest, findCanonicalAttemptAfterBaseline } from "@/lib/canonical";
import { StatusPill } from "@/components/StatusPill";

const kinds: EvidenceKind[] = ["VERSIONED_SOURCE", "TRANSACTION", "PUBLIC_ARTIFACT", "LIVE_DEPLOYMENT"];

export default function SubmitPage({ params }: { params: Promise<{ engagementId: string }> }) {
  const { account, connect } = useWallet();
  const [engagementId, setEngagementId] = useState("");
  const [item, setItem] = useState<Engagement | null>(null);
  const [refs, setRefs] = useState<Record<number, EvidenceRef[]>>({});
  const [hash, setHash] = useState("");
  const [error, setError] = useState("");
  const [canonical, setCanonical] = useState("");
  const [signing, setSigning] = useState(false);
  const pendingAttempt = useRef<{ baselineAttemptCount: number; digest: string; evidenceJson: string; account: string } | null>(null);

  useEffect(() => {
    let active = true;
    params.then(async ({ engagementId: id }) => {
      if (!active) return;
      setEngagementId(id);
      try {
        const next = await readContract<Engagement>("get_engagement", [id]);
        if (active) setItem(next);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Could not load the frozen criteria."); }
    });
    return () => { active = false; };
  }, [params]);

  function addRef(index: number) { setRefs((all) => ({ ...all, [index]: [...(all[index] || []), { criterion: index, kind: "VERSIONED_SOURCE", url: "", note: "" }] })); }
  function updateRef(index: number, refIndex: number, patch: Partial<EvidenceRef>) { setRefs((all) => ({ ...all, [index]: (all[index] || []).map((ref, i) => i === refIndex ? { ...ref, ...patch } : ref) })); }
  function removeRef(index: number, refIndex: number) { setRefs((all) => ({ ...all, [index]: (all[index] || []).filter((_, i) => i !== refIndex) })); }
  const payload = item?.criteria.flatMap((c) => refs[c.index] || []) || [];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (signing) return;
    if (!item || item.status !== "ACTIVE") { setError("Only an ACTIVE engagement can receive an attempt."); return; }
    const evidenceError = validateEvidenceRefs(item.criteria, payload);
    if (evidenceError) { setError(evidenceError); return; }
    setSigning(true);
    setCanonical("");
    try {
      const accounts = account ? [account] : await connect();
      if (!accounts[0]) throw new Error("Connect the performer wallet before signing evidence.");
      const fresh = await readContract<Engagement>("get_engagement", [engagementId]);
      if (fresh.status !== "ACTIVE") throw new Error("This engagement is no longer ACTIVE. Refresh the canonical agreement before submitting.");
      if (fresh.performer.toLowerCase() !== accounts[0].toLowerCase()) throw new Error("The connected wallet is not the designated performer for this engagement.");
      const expectedEvidence = await computeSubmissionDigest(engagementId, fresh.terms_digest, payload);
      pendingAttempt.current = { baselineAttemptCount: fresh.attempt_count, digest: expectedEvidence.digest, evidenceJson: expectedEvidence.storedJson, account: accounts[0].toLowerCase() };
      setItem(fresh);
      const tx = await writeContract("evaluate_attempt", [engagementId, JSON.stringify(payload)], accounts[0], window.ethereum!);
      setHash(tx);
    } catch (e) {
      setSigning(false);
      setError(e instanceof Error ? e.message : "The evidence transaction failed or was rejected.");
    }
  }

  async function confirmCanonicalAttempt() {
    try {
      const expected = pendingAttempt.current;
      if (!expected) throw new Error(CANONICAL_VERIFICATION_ERROR);
      const engagement = await readContract<Engagement>("get_engagement", [engagementId]);
      if (engagement.attempt_count <= expected.baselineAttemptCount) throw new Error(CANONICAL_VERIFICATION_ERROR);
      const attempt = await findCanonicalAttemptAfterBaseline({
        baselineAttemptCount: expected.baselineAttemptCount,
        currentAttemptCount: engagement.attempt_count,
        expectedDigest: expected.digest,
        expectedEvidenceJson: expected.evidenceJson,
        readPage: (offset, limit) => readContract<AttemptPage>("get_attempts", [engagementId, offset, limit]),
      });
      if (!attempt || !canonicalAttemptMatch({ engagement, attempt, expectedDigest: expected.digest, expectedEvidenceJson: expected.evidenceJson })) throw new Error(CANONICAL_VERIFICATION_ERROR);
      setItem(engagement);
      setCanonical("Canonical state verified: attempt " + attempt.number + " · " + attempt.result + " · engagement " + engagement.status + ".");
      setSigning(false);
    } catch (e) {
      setSigning(false);
      throw e;
    }
  }
  function onPhase(phase: TxPhase) { if (["FAILED", "UNDETERMINED", "CANCELED", "MONITORING_STOPPED"].includes(phase)) setSigning(false); }

  if (!item) return <section className="doc"><div className="eyebrow">Engagement {engagementId || "…"}</div><h1>Attach the proof.</h1><p className={error ? "error" : "muted"}>{error || "Reading frozen criteria from Studionet…"}</p></section>;
  if (!canSubmitEvidence(item)) return <section className="doc"><div className="eyebrow">Evidence desk · engagement {item.id}</div><div className="titleRow"><div><h1>Evidence desk closed.</h1><p className="lede">This engagement is {item.status.toLowerCase()}; no further evidence attempts can be appended.</p></div><StatusPill>{item.status}</StatusPill></div>{(hash || signing) && <TransactionNotice key={hash || "pending"} hash={hash} label="Evaluate evidence attempt" awaitingSignature={signing && !hash} onPhase={onPhase} onFinalized={confirmCanonicalAttempt} />}{canonical && <p className="success" role="status">{canonical}</p>}<div className="row"><Link className="button secondary" href={"/work/" + item.id}>Back to agreement</Link><Link className="button secondary" href={"/work/" + item.id + "/history"}>Open attempt ledger</Link></div></section>;
  return <section className="doc"><div className="eyebrow">Evidence desk · engagement {item.id}</div><div className="titleRow"><div><h1>Attach proof to the line.</h1><p className="lede">Each source belongs to one frozen criterion. Validators see the URLs and the evidence content, not a generic claim of completion.</p></div><span className="pill">{payload.length}/10 references</span></div>{(hash || signing) && <TransactionNotice key={hash || "pending"} hash={hash} label="Evaluate evidence attempt" awaitingSignature={signing && !hash} onPhase={onPhase} onFinalized={confirmCanonicalAttempt} />}{canonical && <p className="success" role="status">{canonical}</p>}<form className="form" onSubmit={submit}><div className="criteria">{item.criteria.map((criterion) => <article className="criterion evidenceSheet" key={criterion.index}><div className="row criterionHead"><div><span className="eyebrow">Criterion {String(criterion.index + 1).padStart(2, "0")}</span><h3>{criterion.text}</h3></div><span className="pill">{criterion.required ? "Required" : "Supporting"}</span></div><p className="muted">Attach up to two bounded public sources that directly support this condition.</p>{(refs[criterion.index] || []).map((ref, refIndex) => <div className="evidenceRow" key={refIndex}><label className="field">Source kind<select value={ref.kind} onChange={(e) => updateRef(criterion.index, refIndex, { kind: e.target.value as EvidenceKind })}>{kinds.map((kind) => <option key={kind}>{kind}</option>)}</select></label><label className="field">HTTPS URL<input value={ref.url} onChange={(e) => updateRef(criterion.index, refIndex, { url: e.target.value })} placeholder="https://…" inputMode="url" /></label><label className="field">Short note <span className="muted">optional</span><input value={ref.note || ""} onChange={(e) => updateRef(criterion.index, refIndex, { note: e.target.value })} maxLength={240} placeholder="What this source may demonstrate" /></label><button type="button" className="textButton" onClick={() => removeRef(criterion.index, refIndex)}>Remove source</button></div>)}{(refs[criterion.index] || []).length < 2 && <button type="button" className="secondary" onClick={() => addRef(criterion.index)}>+ Attach evidence</button>}</article>)}</div><details className="technicalDetails"><summary>Review exact signed payload</summary><p className="muted">The contract canonicalizes this bounded list before validator evaluation.</p><pre className="preview">{JSON.stringify(payload, null, 2)}</pre></details>{error && <p className="error" role="alert">{error}</p>}<div className="row"><button className="lemon" type="submit" disabled={signing}>{signing ? "Awaiting wallet signature…" : "Sign evidence submission"}</button><Link className="button secondary" href={"/work/" + item.id}>Back to agreement</Link></div></form></section>;
}
