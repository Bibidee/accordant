"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { readContract } from "@/lib/genlayer";
import { useWallet } from "@/components/WalletContext";
import type { Engagement, EngagementPage } from "@/lib/types";
import { WalletPanel } from "@/components/WalletPanel";

type SectionKey = "created" | "incoming" | "accepted";
type SectionState = { items: Engagement[]; nextOffset: number; total: number; loading: boolean; error: string };

const PAGE_SIZE = 20;
const sectionConfig: Array<{ key: SectionKey; title: string; description: string; method: string }> = [
  { key: "created", title: "Requester-created work", description: "Every proposal you created, including terminal outcomes.", method: "get_requester_engagements" },
  { key: "incoming", title: "Incoming proposals", description: "Proposals addressed to this wallet. Accepted work is shown separately below.", method: "get_performer_incoming" },
  { key: "accepted", title: "Accepted performer work", description: "Only proposals this wallet explicitly accepted.", method: "get_performer_engagements" },
];

const initialSections: Record<SectionKey, SectionState> = {
  created: { items: [], nextOffset: 0, total: 0, loading: false, error: "" },
  incoming: { items: [], nextOffset: 0, total: 0, loading: false, error: "" },
  accepted: { items: [], nextOffset: 0, total: 0, loading: false, error: "" },
};

const statusText: Record<string, string> = {
  PROPOSED: "Awaiting acceptance", ACTIVE: "In progress", COMPLETED: "Completed",
  DECLINED: "Declined", CANCELLED: "Cancelled", EXPIRED: "Expired",
};

async function readSection(wallet: string, config: (typeof sectionConfig)[number], offset: number) {
  const page = await readContract<EngagementPage>(config.method, [wallet, offset, PAGE_SIZE]);
  const items = await Promise.all((page.ids || []).map((id) => readContract<Engagement>("get_engagement", [String(id)])));
  return { items, nextOffset: page.next_offset || 0, total: page.total || 0 };
}

export default function WorkPage() {
  const { account } = useWallet();
  const [sections, setSections] = useState(initialSections);
  const loadVersion = useRef(0);

  const patchSection = useCallback((key: SectionKey, patch: Partial<SectionState>) => {
    setSections((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  }, []);

  const loadAll = useCallback(async (wallet = account) => {
    const version = ++loadVersion.current;
    if (!wallet) {
      setSections(initialSections);
      return;
    }
    setSections((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, { ...value, loading: true, error: "" }])) as Record<SectionKey, SectionState>);
    for (const config of sectionConfig) {
      if (version !== loadVersion.current) return;
      try {
        const result = await readSection(wallet, config, 0);
        if (version === loadVersion.current) patchSection(config.key, { ...result, loading: false });
      } catch (e) {
        if (version === loadVersion.current) patchSection(config.key, { loading: false, error: e instanceof Error ? e.message : "Could not load this page." });
      }
    }
  }, [account, patchSection]);

  const loadMore = useCallback(async (key: SectionKey) => {
    const config = sectionConfig.find((entry) => entry.key === key);
    const current = sections[key];
    if (!account || !config || !current.nextOffset || current.loading) return;
    patchSection(key, { loading: true, error: "" });
    try {
      const result = await readSection(account, config, current.nextOffset);
      setSections((all) => {
        const existing = new Set(all[key].items.map((item) => item.id));
        return { ...all, [key]: { ...all[key], items: [...all[key].items, ...result.items.filter((item) => !existing.has(item.id))], nextOffset: result.nextOffset, total: result.total, loading: false } };
      });
    } catch (e) {
      patchSection(key, { loading: false, error: e instanceof Error ? e.message : "Could not load the next page." });
    }
  }, [account, patchSection, sections]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAll(account); }, 0);
    return () => window.clearTimeout(timer);
  }, [account, loadAll]);

  const loadedCount = Object.values(sections).reduce((sum, section) => sum + section.items.length, 0);
  const acceptedCount = sections.accepted.total;
  const incomingCount = sections.incoming.total;

  return <>
    <WalletPanel />
    <div className="workspace">
      <section className="doc">
        <div className="eyebrow">Work desk · bounded wallet pages</div>
        <div className="titleRow"><div><h1>Your engagements</h1><p className="lede">Canonical work is separated by role and loaded twenty records at a time.</p></div><span className="networkBadge">{account ? account.slice(0, 6) + "…" + account.slice(-4) : "Not connected"}</span></div>
        <div className="statRow" aria-label="Engagement summary"><div className="stat"><strong>{sections.created.total}</strong><small>Created</small></div><div className="stat"><strong>{acceptedCount}</strong><small>Accepted work</small></div><div className="stat"><strong>{incomingCount}</strong><small>Incoming history</small></div><div className="stat"><strong>{loadedCount}</strong><small>Loaded now</small></div></div>
        <div className="row"><button onClick={() => { void loadAll(); }} disabled={!account || Object.values(sections).some((section) => section.loading)}>{Object.values(sections).some((section) => section.loading) ? "Reading Studionet…" : account ? "Refresh first pages" : "Connect and load"}</button><Link className="button lemon" href="/work/new">New engagement</Link></div>
        {!account && <div className="panel emptyWork"><strong>Connect a wallet to load bounded wallet pages.</strong><p className="muted">Public agreements and attempt history remain readable without a wallet.</p></div>}
        {account && sectionConfig.map((config) => {
          const section = sections[config.key];
          return <section className="workSection" key={config.key} aria-labelledby={config.key + "-heading"}>
            <div className="sectionRow row"><div><h2 className="sectionTitle" id={config.key + "-heading"}>{config.title}</h2><p className="muted sectionDescription">{config.description}</p></div><span className="pill">{section.total} total</span></div>
            {section.error && <p className="error" role="alert">{section.error}</p>}
            {section.loading && section.items.length === 0 && <div className="panel">Reading this page from Studionet…</div>}
            {!section.loading && section.items.length === 0 && !section.error && <div className="panel"><strong>No records in this section.</strong><p className="muted">This view is backed by the contract’s role-specific index.</p></div>}
            <div className="cardList">{section.items.map((item) => <Link className="engagementCard" key={item.id} href={"/work/" + item.id}><div className="row"><span className={"pill " + (item.status === "COMPLETED" ? "success" : "")}>{statusText[item.status] || item.status}</span><span className="muted">Agreement #{item.id}</span></div><h2>{item.title}</h2><p className="muted">{item.summary}</p><div className="meta"><span>{item.criteria?.length || 0} frozen criteria</span><span>{config.key === "created" ? "Requester" : config.key === "accepted" ? "Accepted performer" : "Incoming"}</span><span>{item.attempt_count} attempt{item.attempt_count === 1 ? "" : "s"}</span></div></Link>)}</div>
            {section.nextOffset !== 0 && <button className="secondary loadMore" onClick={() => { void loadMore(config.key); }} disabled={section.loading}>{section.loading ? "Loading next page…" : `Load more · ${Math.max(0, section.total - section.items.length)} remaining`}</button>}
          </section>;
        })}
      </section>
      <aside className="panel context"><div className="eyebrow">The work model</div><h3>One milestone. One shared line.</h3><p className="muted">Accordant keeps the agreement inspectable: two wallets, bounded criteria, criterion-bound evidence, and an append-only ledger.</p><div className="previewLine"><span>Reads</span><strong>20 per page</strong></div><div className="previewLine"><span>Incoming</span><strong>Separate index</strong></div><div className="previewLine"><span>Accepted work</span><strong>Explicit opt-in</strong></div></aside>
    </div>
  </>;
}
