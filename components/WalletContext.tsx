"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { currentChainId, disconnectInApp, requestAccounts, availableAccounts, switchToStudionet } from "@/lib/wallet";

type WalletContextValue = {
  account: string;
  chain: number | null;
  error: string;
  connect: () => Promise<string[]>;
  disconnect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  refresh: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState("");
  const [chain, setChain] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const ids = await availableAccounts();
      setAccount(ids[0] || "");
      setChain(ids[0] ? await currentChainId() : null);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet error");
    }
  }

  async function connect() {
    setError("");
    const ids = await requestAccounts();
    setAccount(ids[0] || "");
    setChain(ids[0] ? await currentChainId() : null);
    return ids;
  }

  async function disconnect() {
    await disconnectInApp();
    setAccount("");
    setChain(null);
  }

  async function switchNetwork() {
    await switchToStudionet();
    await refresh();
  }

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => { void refresh(); }, 0);
    const provider = window.ethereum;
    const changed = () => { void refresh(); };
    provider?.on?.("accountsChanged", changed);
    provider?.on?.("chainChanged", changed);
    window.addEventListener("accordant:disconnect", changed);
    return () => {
      window.clearTimeout(initialRefresh);
      provider?.removeListener?.("accountsChanged", changed);
      provider?.removeListener?.("chainChanged", changed);
      window.removeEventListener("accordant:disconnect", changed);
    };
  }, []);

  const value = { account, chain, error, connect, disconnect, switchNetwork, refresh };
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}
