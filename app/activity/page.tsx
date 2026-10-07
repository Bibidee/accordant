"use client";

import { useEffect, useState } from "react";
import { EXPLORER_URL } from "@/lib/constants";
import { getTransaction, type TransactionRecord } from "@/lib/genlayer";
import { readActivity, updateRememberedTransaction, type StoredTransaction } from "@/lib/activity";

export default function Activity() {
  const [items] = useState<StoredTransaction[]>(() => readActivity()); const [records, setRecords] = useState<Record<string, TransactionRecord>>({});
  useEffect(() => { let active = true; Promise.all(items.map(async (item) => { try { const record = await getTransaction(item.hash); updateRememberedTransaction(item.hash, { phase: record.phase }); return [item.hash, record] as const; } catch { return null; } })).then((values) => { if (active) setRecords(Object.fromEntries(values.filter((value): value is readonly [string, TransactionRecord] => value !== null))); }); return () => { active = false; }; }, [items]);
  return <section className="doc"><div className="eyebrow">Receipt rail · this device</div><div className="titleRow"><div><h1>Activity you can reconcile.</h1><p className="lede">Local hashes are recovery pointers. Studionet remains the source of truth for every protocol phase and canonical state.</p></div><span className="pill">{items.length} saved</span></div><div className="panel receiptIntro"><strong>Never rebroadcast from a timeout.</strong><p className="muted">A transaction can be accepted provisionally, finalized, undetermined, or failed. Reconcile the exact hash before taking another action.</p></div><div className="ledger">{items.length === 0 && <div className="panel"><strong>No receipt pointers on this device.</strong><p className="muted">Signed Accordant actions will appear here with an explorer link and their latest observed phase.</p></div>}{items.map((item) => { const record = records[item.hash]; const phase = record?.phase || item.phase; return <article className="ledgerRow receiptRow" key={item.hash}><span className="ledgerNumber">{item.action.replaceAll("_", " ")}</span><span><strong>{phase}</strong><small>{new Date(item.createdAt).toLocaleString()}</small><small className="mono">{item.hash}</small></span><span className="row"><a className="button secondary" href={`${EXPLORER_URL}/tx/${item.hash}`} target="_blank" rel="noreferrer">Explorer</a></span></article>; })}</div></section>;
}
