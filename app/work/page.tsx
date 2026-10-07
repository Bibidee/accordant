"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readContract } from "@/lib/genlayer";
import { availableAccounts, requestAccounts } from "@/lib/wallet";
import type { Engagement, EngagementPage } from "@/lib/types";
import { WalletPanel } from "@/components/WalletPanel";

const statusText: Record<string, string> = { PROPOSED: "Awaiting acceptance", ACTIVE: "In progress", COMPLETED: "Completed", DECLINED: "Declined", CANCELLED: "Cancelled", EXPIRED: "Expired" };

export default function WorkPage() {
  const [account, setAccount] = useState("");
  const [items, setItems] = useState<Engagement[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load(existing?: string[]) {
    setLoading(true); setError("");
    try {
      const accounts = existing?.length ? existing : await requestAccounts();
      if (!accounts[0]) throw new Error("Connect a wallet to load canonical engagements.");
      const ids: string[] = []; let offset = 0; let pageCount = 0;
      do { const page = await readContract<EngagementPage>("get_wallet_engagements", [accounts[0], offset, 20], window.ethereum, accounts[0]); ids.push(...(page.ids || [])); offset = page.next_offset; pageCount += 1; } while (offset && pageCount < 5);
      const engagements: Engagement[] = [];
      for (const id of ids) engagements.push(await readContract<Engagement>("get_engagement", [String(id)], window.ethereum, accounts[0]));
      setAccount(accounts[0]); setItems(engagements);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load canonical engagements."); }
    finally { setLoading(false); }
  }

  useEffect(() => { availableAccounts().then((ids) => { if (ids[0]) load(ids); }).catch(() => undefined); }, []);
  const counts = useMemo(() => ({ all: items.length, active: items.filter((item) => item.status === "ACTIVE").length, proposed: items.filter((item) => item.status === "PROPOSED").length, completed: items.filter((item) => item.status === "COMPLETED").length }), [items]);
  const visible = filter === "ALL" ? items : items.filter((item) => item.status === filter);

  return <>
    <WalletPanel />
    <div className="workspace">
      <section className="doc">
        <div className="eyebrow">Work desk · wallet-scoped</div>
        <div className="titleRow"><div><h1>Your engagements</h1><p className="lede">The acceptance line, the evidence, and the canonical state in one place.</p></div><span className="networkBadge">{account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Not connected"}</span></div>
        <div className="statRow" aria-label="Engagement summary"><div className="stat"><strong>{counts.all}</strong><small>All agreements</small></div><div className="stat"><strong>{counts.active}</strong><small>In progress</small></div><div className="stat"><strong>{counts.proposed}</strong><small>Awaiting reply</small></div><div className="stat"><strong>{counts.completed}</strong><small>Completed</small></div></div>
        <div className="row"><button onClick={() => load()}>{loading ? "Reading Studionet…" : account ? "Refresh work" : "Connect and load"}</button><Link className="button lemon" href="/work/new">New engagement</Link></div>
        <div className="workTabs" role="tablist" aria-label="Filter engagements">{[["ALL", "All"], ["ACTIVE", "In progress"], ["PROPOSED", "Awaiting acceptance"], ["COMPLETED", "Completed"]].map(([value, label]) => <button key={value} className={`workTab ${filter === value ? "active" : ""}`} onClick={() => setFilter(value)} role="tab" aria-selected={filter === value}>{label}</button>)}</div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="cardList">{!loading && visible.length === 0 && <div className="panel"><strong>No canonical engagements in this view.</strong><p className="muted">Create a proposal or connect the wallet that is a requester or designated performer.</p></div>}{visible.map((item) => <Link className="engagementCard" key={item.id} href={`/work/${item.id}`}><div className="row"><span className={`pill ${item.status === "COMPLETED" ? "success" : ""}`}>{statusText[item.status] || item.status}</span><span className="muted">Agreement #{item.id}</span></div><h2>{item.title}</h2><p className="muted">{item.summary}</p><div className="meta"><span>{item.criteria?.length || 0} frozen criteria</span><span>{item.requester?.toLowerCase() === account.toLowerCase() ? "Requester" : "Performer"}</span><span>{item.attempt_count} attempt{item.attempt_count === 1 ? "" : "s"}</span></div></Link>)}</div>
      </section>
      <aside className="panel context"><div className="eyebrow">The work model</div><h3>One milestone. One shared line.</h3><p className="muted">Accordant keeps the agreement inspectable: two wallets, bounded criteria, criterion-bound evidence, and an append-only ledger.</p><div className="previewLine"><span>Reads</span><strong>Canonical</strong></div><div className="previewLine"><span>Evidence</span><strong>HTTPS only</strong></div><div className="previewLine"><span>History</span><strong>Append-only</strong></div></aside>
    </div>
  </>;
}
