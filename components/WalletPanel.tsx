"use client";
import { CHAIN_ID } from "@/lib/constants";
import { useWallet } from "@/components/WalletContext";

export function WalletPanel() {
  const { account, chain, error, connect, disconnect, switchNetwork } = useWallet();
  const accountLabel = account ? account.slice(0, 6) + "…" + account.slice(-4) : "Wallet not connected";
  const networkLabel = chain === null ? "Connect to load canonical work" : chain === CHAIN_ID ? "GenLayer Studionet · 61999" : "Wrong network: " + chain;
  return <section className="walletCard"><div className="walletIdentity"><span className={"connectionDot " + (account ? "is-on" : "")} aria-hidden="true" /><div><strong>{accountLabel}</strong><p>{networkLabel}</p></div></div><div className="row walletActions">{!account && <button onClick={() => { void connect().catch(() => undefined); }}>Connect wallet</button>}{account && chain !== CHAIN_ID && <button onClick={() => { void switchNetwork().catch(() => undefined); }}>Switch to Studionet</button>}{account && <button className="secondary" onClick={() => { void disconnect(); }}>Disconnect in app</button>}</div>{error && <p className="error">{error}</p>}</section>;
}
