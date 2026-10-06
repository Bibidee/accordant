"use client";
import { useEffect, useState } from "react";
import { EXPLORER_URL } from "@/lib/constants";
import { getTransaction, type TransactionRecord } from "@/lib/genlayer";
import { readActivity, updateRememberedTransaction, type StoredTransaction } from "@/lib/activity";
export default function Activity() {
  const [items] = useState<StoredTransaction[]>(() => readActivity()); const [records, setRecords] = useState<Record<string, TransactionRecord>>({});
  useEffect(() => {
    Promise.all(items.map(async (item) => {
      try { const record = await getTransaction(item.hash); updateRememberedTransaction(item.hash, { phase: record.phase }); return [item.hash, record] as const; }
      catch { return null; }
    })).then((values) => {
      setRecords(Object.fromEntries(values.filter((value): value is readonly [string, TransactionRecord] => value !== null)));
    });
  }, [items]);
  return <section className="doc"><div className="eyebrow">Activity</div><h1>Transaction recovery</h1><p className="muted">Hashes are saved locally only as recovery pointers. Canonical state is always reread from Studionet; a timeout never triggers a blind rebroadcast.</p><div className="ledger">{items.length === 0 && <div className="panel">No submitted transaction hashes saved on this device.</div>}{items.map((item) => { const record = records[item.hash]; return <div className="ledgerRow" key={item.hash}><span className="ledgerNumber">{item.action}</span><span><strong>{record?.phase || item.phase}</strong><small className="mono">{item.hash}</small></span><a className="button secondary" href={`${EXPLORER_URL}/tx/${item.hash}`} target="_blank" rel="noreferrer">Explorer</a></div>; })}</div></section>;
}
