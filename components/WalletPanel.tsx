"use client";
import { useEffect, useState } from "react";
import { CHAIN_ID } from "@/lib/constants";
import { currentChainId, disconnectInApp, requestAccounts, switchToStudionet } from "@/lib/wallet";

export function WalletPanel() {
  const [account, setAccount] = useState("");
  const [chain, setChain] = useState<number | null>(null);
  const [error, setError] = useState("");
  async function refresh() { try { if (!window.ethereum) { setAccount(""); setChain(null); return; } const ids = await window.ethereum.request({ method: "eth_accounts" }) as string[]; setAccount(ids[0] || ""); setChain(ids[0] ? await currentChainId() : null); } catch (e) { setError(e instanceof Error ? e.message : "Wallet error"); } }
  useEffect(() => {
    const initialRefresh = window.setTimeout(refresh, 0);
    const provider = window.ethereum;
    const accountsChanged = () => refresh();
    const chainChanged = () => refresh();
    provider?.on?.("accountsChanged", accountsChanged);
    provider?.on?.("chainChanged", chainChanged);
    window.addEventListener("accordant:disconnect", accountsChanged);
    return () => { window.clearTimeout(initialRefresh); provider?.removeListener?.("accountsChanged", accountsChanged); provider?.removeListener?.("chainChanged", chainChanged); window.removeEventListener("accordant:disconnect", accountsChanged); };
  }, []);
  async function connect() { try { setError(""); const ids = await requestAccounts(); setAccount(ids[0] || ""); setChain(await currentChainId()); } catch (e) { setError(e instanceof Error ? e.message : "Connection failed"); } }
  return <section className="walletCard"><div><strong>{account ? `${account.slice(0,6)}…${account.slice(-4)}` : "Wallet not connected"}</strong><p>{chain === null ? "Network unknown" : chain === CHAIN_ID ? "GenLayer Studionet · 61999" : `Wrong network: ${chain}`}</p></div><div className="row">{!account && <button onClick={connect}>Connect wallet</button>}{account && chain !== CHAIN_ID && <button onClick={() => switchToStudionet().then(refresh).catch((e) => setError(e instanceof Error ? e.message : "Network switch failed"))}>Switch to Studionet</button>}{account && <button className="secondary" onClick={() => disconnectInApp().then(refresh)}>Disconnect in app</button>}</div>{error && <p className="error">{error}</p>}</section>;
}
