import { CHAIN_ID, CHAIN_ID_HEX, RPC_URL } from "@/lib/constants";

export type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

declare global { interface Window { ethereum?: Eip1193Provider; } }

export async function requestAccounts(): Promise<string[]> {
  if (!window.ethereum) throw new Error("No injected wallet detected. Install or enable MetaMask, Rabby, or another EIP-1193 wallet.");
  return (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
}

export async function currentChainId(): Promise<number> {
  if (!window.ethereum) throw new Error("No injected wallet detected");
  const value = (await window.ethereum.request({ method: "eth_chainId" })) as string;
  return parseInt(value, 16);
}

export async function switchToStudionet(): Promise<void> {
  if (!window.ethereum) throw new Error("No injected wallet detected");
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
  } catch {
    await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: CHAIN_ID_HEX, chainName: "GenLayer Studionet", rpcUrls: [RPC_URL], nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 } }] });
  }
  const chain = await currentChainId();
  if (chain !== CHAIN_ID) throw new Error(`Wrong network. Expected ${CHAIN_ID}.`);
}

export async function disconnectInApp(): Promise<void> {
  window.dispatchEvent(new CustomEvent("accordant:disconnect"));
}
