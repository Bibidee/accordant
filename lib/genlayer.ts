import { createClient, chains } from "genlayer-js";
import { CHAIN_ID, CONTRACT_ADDRESS, RPC_URL, ZERO_ADDRESS } from "@/lib/constants";
import type { Eip1193Provider } from "@/lib/wallet";
import { rememberTransaction, updateRememberedTransaction } from "@/lib/activity";
import type { TxPhase } from "@/lib/types";

export type ContractAddress = `0x${string}`;
export type TransactionRecord = { hash: string; protocolStatus: string; phase: TxPhase; executionStatus?: string; raw: Record<string, unknown> };

export function assertProductionContractConfigured(): void {
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS.toLowerCase() === ZERO_ADDRESS) {
    throw new Error("Accordant contract is not configured. Set NEXT_PUBLIC_ACCORDANT_CONTRACT to the deployed Studionet address.");
  }
}
export function getGenLayerConfig() { return { chainId: CHAIN_ID, rpcUrl: RPC_URL, contractAddress: CONTRACT_ADDRESS }; }
function address(value: string): ContractAddress { if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error("The configured contract address is malformed."); return value as ContractAddress; }
function client(provider?: Eip1193Provider, account?: string) {
  assertProductionContractConfigured();
  return createClient({ chain: chains.studionet, endpoint: RPC_URL, provider: provider as never, account: account as ContractAddress | undefined });
}

export async function readContract<T>(functionName: string, args: unknown[] = [], provider?: Eip1193Provider, account?: string): Promise<T> {
  return await client(provider, account).readContract({ address: address(CONTRACT_ADDRESS), functionName, args: args as never[] }) as T;
}
export async function writeContract(functionName: string, args: unknown[], account: string, provider: Eip1193Provider): Promise<string> {
  if (!account) throw new Error("Connect the wallet before signing this action.");
  const rawChain = await provider.request({ method: "eth_chainId" });
  const chainId = typeof rawChain === "string" ? Number.parseInt(rawChain, 16) : Number(rawChain);
  if (chainId !== CHAIN_ID) throw new Error(`Wrong network. Expected GenLayer Studionet ${CHAIN_ID}.`);
  const hash = await client(provider, account).writeContract({ address: address(CONTRACT_ADDRESS), functionName, args: args as never[], value: 0n });
  const transactionHash = String(hash);
  rememberTransaction({ hash: transactionHash, action: functionName, createdAt: Date.now(), phase: "SUBMITTED" });
  return transactionHash;
}

function executionFromRaw(raw: Record<string, unknown>): string | undefined {
  if (raw.txExecutionResultName) return String(raw.txExecutionResultName);
  const consensus = raw.consensus_data as { leader_receipt?: Array<{ execution_result?: string }> } | undefined;
  const leader = consensus?.leader_receipt?.[0]?.execution_result;
  if (leader === "SUCCESS") return "FINISHED_WITH_RETURN";
  if (leader === "ERROR") return "FINISHED_WITH_ERROR";
  return undefined;
}
function phaseForStatus(status: string, executionStatus?: string): TxPhase {
  const normalized = status.toUpperCase();
  if (normalized === "UNDETERMINED" || normalized.includes("TIMEOUT")) return "UNDETERMINED";
  if (normalized === "CANCELED" || normalized === "CANCELLED") return "CANCELED";
  if (normalized === "FINALIZED") return executionStatus === "FINISHED_WITH_RETURN" ? "FINALIZED" : "FAILED";
  if (normalized === "ACCEPTED") return executionStatus === "FINISHED_WITH_RETURN" ? "ACCEPTED_PROVISIONAL" : "FAILED";
  if (["PENDING", "PROPOSING", "COMMITTING", "REVEALING"].includes(normalized)) return "CONSENSUS";
  return "SUBMITTED";
}
export function toTransactionRecord(hash: string, raw: Record<string, unknown>): TransactionRecord {
  const protocolStatus = String(raw.statusName || raw.status || "UNKNOWN");
  const executionStatus = executionFromRaw(raw);
  return { hash, protocolStatus, phase: phaseForStatus(protocolStatus, executionStatus), executionStatus, raw };
}
export async function getTransaction(hash: string, provider?: Eip1193Provider): Promise<TransactionRecord> {
  const raw = await client(provider).getTransaction({ hash: hash as never });
  return toTransactionRecord(hash, raw as unknown as Record<string, unknown>);
}
export async function monitorTransaction(hash: string, onUpdate?: (record: TransactionRecord) => void, options?: { intervalMs?: number; attempts?: number; provider?: Eip1193Provider }): Promise<TransactionRecord> {
  const intervalMs = options?.intervalMs ?? 3000; let remaining = options?.attempts ?? 40; let last: TransactionRecord | undefined;
  while (remaining-- > 0) {
    last = await getTransaction(hash, options?.provider); onUpdate?.(last); updateRememberedTransaction(hash, { phase: last.phase });
    if (["FINALIZED", "UNDETERMINED", "FAILED", "CANCELED"].includes(last.phase)) return last;
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }
  return last ? { ...last, phase: ["FINALIZED", "FAILED", "UNDETERMINED", "CANCELED"].includes(last.phase) ? last.phase : "MONITORING_STOPPED" } : { hash, protocolStatus: "UNKNOWN", phase: "MONITORING_STOPPED", raw: {} };
}
