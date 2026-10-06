"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readContract } from "@/lib/genlayer";
import { requestAccounts } from "@/lib/wallet";
import type { Attempt, Engagement } from "@/lib/types";
export default function History({ params }: { params: Promise<{ engagementId: string }> }) {
  const [id, setId] = useState(""); const [item, setItem] = useState<Engagement | null>(null); const [attempts, setAttempts] = useState<Attempt[]>([]); const [error, setError] = useState("");
  useEffect(() => { params.then(({ engagementId }) => { setId(engagementId); requestAccounts().then(async (a) => { const [engagement, ledger] = await Promise.all([readContract<Engagement>("get_engagement", [engagementId], window.ethereum, a[0]), readContract<Attempt[]>("get_attempts", [engagementId], window.ethereum, a[0])]); setItem(engagement); setAttempts(ledger || []); }).catch((e) => setError(e instanceof Error ? e.message : "Could not load the canonical attempt history.")); }); }, [params]);
  return <section className="doc"><div className="eyebrow">Engagement {id}</div><h1>Attempt history</h1><p className="muted">Append-only means earlier revision and inconclusive attempts remain visible after a later submission.</p>{error && <p className="error">{error}</p>}{item && <div className="panel"><strong>{item.title}</strong><p className="muted">Current state: {item.status} · {attempts.length} recorded attempt{attempts.length === 1 ? "" : "s"}</p></div>}<div className="ledger">{attempts.length === 0 && !error && <div className="panel">No attempts recorded yet.</div>}{attempts.map((attempt) => <Link className="ledgerRow" key={attempt.number} href={`/work/${id}/review/${attempt.number}`}><span className="ledgerNumber">{String(attempt.number).padStart(2, "0")}</span><span><strong>Attempt {attempt.number}</strong><small>{new Date(attempt.submitted_at * 1000).toLocaleString()}</small></span><span className="decision">{attempt.result}</span></Link>)}</div></section>;
}
