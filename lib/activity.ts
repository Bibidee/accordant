import type { TxPhase } from "@/lib/types";

export type StoredTransaction = { hash: string; action: string; createdAt: number; phase: TxPhase };
const KEY = "accordant.activity.v1";

export function readActivity(): StoredTransaction[] {
  if (typeof window === "undefined") return [];
  try { const value = JSON.parse(window.localStorage.getItem(KEY) || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}

export function rememberTransaction(tx: StoredTransaction): void {
  if (typeof window === "undefined") return;
  const existing = readActivity().filter((item) => item.hash !== tx.hash);
  window.localStorage.setItem(KEY, JSON.stringify([tx, ...existing].slice(0, 50)));
}

export function updateRememberedTransaction(hash: string, patch: Partial<StoredTransaction>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(readActivity().map((item) => item.hash === hash ? { ...item, ...patch } : item)));
}
