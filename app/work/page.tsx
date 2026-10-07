"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { readContract } from "@/lib/genlayer";
import { useWallet } from "@/components/WalletContext";
import type { Engagement, EngagementPage } from "@/lib/types";
import { WalletPanel } from "@/components/WalletPanel";
import { isCurrentWalletPageRequest, latestFirstPage, olderPage, pageAtOffset } from "@/lib/pagination";
import { WORK_SECTION_CONFIG, type WorkSectionKey, workSectionLabel } from "@/lib/work";

type SectionState = { items: Engagement[]; offset: number; hasOlder: boolean; remainingCount: number; total: number; loading: boolean; error: string };

const PAGE_SIZE = 20;

function initialSections(): Record<WorkSectionKey, SectionState> {
  return {
    created: { items: [], offset: 0, hasOlder: false, remainingCount: 0, total: 0, loading: false, error: "" },
    incoming: { items: [], offset: 0, hasOlder: false, remainingCount: 0, total: 0, loading: false, error: "" },
    accepted: { items: [], offset: 0, hasOlder: false, remainingCount: 0, total: 0, loading: false, error: "" },
  };
}

const statusText: Record<string, string> = {
  PROPOSED: "Awaiting acceptance", ACTIVE: "In progress", COMPLETED: "Completed",
  DECLINED: "Declined", CANCELLED: "Cancelled", EXPIRED: "Expired",
};

async function readSection(wallet: string, config: (typeof WORK_SECTION_CONFIG)[number], offset: number, limit = PAGE_SIZE) {
  const page = await readContract<EngagementPage>(config.method, [wallet, offset, limit]);
  const items = await Promise.all((page.ids || []).map((id) => readContract<Engagement>("get_engagement", [String(id)])));
  const window = pageAtOffset(page.total || 0, offset, PAGE_SIZE);
  return { items: items.reverse(), offset: window.offset, hasOlder: window.hasOlder, remainingCount: window.remainingCount, total: page.total || 0 };
}

async function readLatestSection(wallet: string, config: (typeof WORK_SECTION_CONFIG)[number]) {
  const countPage = await readContract<EngagementPage>(config.method, [wallet, 0, 1]);
  const window = latestFirstPage(countPage.total || 0, PAGE_SIZE);
  return readSection(wallet, config, window.offset, window.limit);
}

export default function WorkPage() {
  const { account } = useWallet();
  const [sections, setSections] = useState<Record<WorkSectionKey, SectionState>>(initialSections);
  const loadVersion = useRef(0);
  const accountRef = useRef(account);
  const sectionsRef = useRef(sections);
  useEffect(() => { accountRef.current = account; }, [account]);
  useEffect(() => { sectionsRef.current = sections; }, [sections]);

  const patchSection = useCallback((key: WorkSectionKey, patch: Partial<SectionState>) => {
    setSections((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  }, []);

  const loadAll = useCallback(async (wallet = account) => {
    const version = ++loadVersion.current;
    if (!wallet) {
      setSections(initialSections());
      return;
    }
    setSections((current) => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, { ...value, loading: true, error: "" }])) as Record<WorkSectionKey, SectionState>);
    for (const config of WORK_SECTION_CONFIG) {
      if (!isCurrentWalletPageRequest(wallet, version, accountRef.current, loadVersion.current)) return;
      try {
        const result = await readLatestSection(wallet, config);
        if (isCurrentWalletPageRequest(wallet, version, accountRef.current, loadVersion.current)) patchSection(config.key, { ...result, loading: false });
      } catch (e) {
        if (isCurrentWalletPageRequest(wallet, version, accountRef.current, loadVersion.current)) patchSection(config.key, { loading: false, error: e instanceof Error ? e.message : "Could not load this page." });
      }
    }
  }, [account, patchSection]);

  const loadOlder = useCallback(async (key: WorkSectionKey) => {
    const config = WORK_SECTION_CONFIG.find((entry) => entry.key === key);
    const wallet = account;
    const version = loadVersion.current;
    const current = sectionsRef.current[key];
    if (!wallet || !config || !current.hasOlder || current.loading) return;
    const target = olderPage(current.total, current.offset, PAGE_SIZE);
    patchSection(key, { loading: true, error: "" });
    try {
      const result = await readSection(wallet, config, target.offset, target.limit);
      if (!isCurrentWalletPageRequest(wallet, version, accountRef.current, loadVersion.current)) return;
      setSections((all) => {
        if (!isCurrentWalletPageRequest(wallet, version, accountRef.current, loadVersion.current) || all[key].offset !== current.offset) return all;
        const existing = new Set(all[key].items.map((item) => item.id));
        return { ...all, [key]: { ...all[key], ...result, items: [...all[key].items, ...result.items.filter((item) => !existing.has(item.id))], loading: false } };
      });
    } catch (e) {
      if (isCurrentWalletPageRequest(wallet, version, accountRef.current, loadVersion.current)) patchSection(key, { loading: false, error: e instanceof Error ? e.message : "Could not load older records." });
    }
  }, [account, patchSection]);

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
        <div className="titleRow"><div><h1>Your engagements</h1><p className="lede">Canonical work is separated by role and loaded newest first, twenty records at a time.</p></div><span className="networkBadge">{account ? account.slice(0, 6) + "…" + account.slice(-4) : "Not connected"}</span></div>
        <div className="statRow" aria-label="Engagement summary"><div className="stat"><strong>{sections.created.total}</strong><small>Created</small></div><div className="stat"><strong>{acceptedCount}</strong><small>Accepted work</small></div><div className="stat"><strong>{incomingCount}</strong><small>Incoming history</small></div><div className="stat"><strong>{loadedCount}</strong><small>Loaded now</small></div></div>
        <div className="row"><button onClick={() => { void loadAll(); }} disabled={!account || Object.values(sections).some((section) => section.loading)}>{Object.values(sections).some((section) => section.loading) ? "Reading Studionet…" : account ? "Refresh latest pages" : "Connect and load"}</button><Link className="button lemon" href="/work/new">New engagement</Link></div>
        {!account && <div className="panel emptyWork"><strong>Connect a wallet to load bounded wallet pages.</strong><p className="muted">Public agreements and attempt history remain readable without a wallet.</p></div>}
        {account && WORK_SECTION_CONFIG.map((config) => {
          const section = sections[config.key];
          return <section className="workSection" key={config.key} aria-labelledby={config.key + "-heading"}>
            <div className="sectionRow row"><div><h2 className="sectionTitle" id={config.key + "-heading"}>{config.title}</h2><p className="muted sectionDescription">{config.description}</p></div><span className="pill">{section.total} total</span></div>
            {section.error && <p className="error" role="alert">{section.error}</p>}
            {section.loading && section.items.length === 0 && <div className="panel">Reading this page from Studionet…</div>}
            {!section.loading && section.items.length === 0 && !section.error && <div className="panel"><strong>No records in this section.</strong><p className="muted">This view is backed by the contract’s role-specific index.</p></div>}
            <div className="cardList">{section.items.map((item) => <Link className="engagementCard" key={item.id} href={"/work/" + item.id}><div className="row"><span className={"pill " + (item.status === "COMPLETED" ? "success" : "")}>{statusText[item.status] || item.status}</span><span className="muted">Agreement #{item.id}</span></div><h2>{item.title}</h2><p className="muted">{item.summary}</p><div className="meta"><span>{item.criteria?.length || 0} frozen criteria</span><span>{workSectionLabel(config.key)}</span><span>{item.attempt_count} attempt{item.attempt_count === 1 ? "" : "s"}</span></div></Link>)}</div>
            {section.hasOlder && <button className="secondary loadMore" onClick={() => { void loadOlder(config.key); }} disabled={section.loading}>{section.loading ? "Loading older records…" : "Load older · " + section.remainingCount + " remaining"}</button>}
          </section>;
        })}
      </section>
      <aside className="panel context"><div className="eyebrow">The work model</div><h3>One milestone. One shared line.</h3><p className="muted">Accordant keeps the agreement inspectable: two wallets, bounded criteria, criterion-bound evidence, and an append-only ledger.</p><div className="previewLine"><span>Reads</span><strong>20 per page</strong></div><div className="previewLine"><span>Order</span><strong>Newest first</strong></div><div className="previewLine"><span>Incoming</span><strong>Separate index</strong></div><div className="previewLine"><span>Accepted work</span><strong>Explicit opt-in</strong></div></aside>
    </div>
  </>;
}
