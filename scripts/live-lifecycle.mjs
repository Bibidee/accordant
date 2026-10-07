import keytar from "keytar";
import { chains, createAccount, createClient } from "genlayer-js";

const rpc = "https://studio.genlayer.com/api";
const contractAddress = process.argv[2] || process.env.NEXT_PUBLIC_ACCORDANT_CONTRACT;
if (!contractAddress) throw new Error("Pass the deployed Accordant contract address.");

const service = "genlayer-cli";
const alicePrivateKey = await keytar.getPassword(service, "account:fresh-alice");
const bobPrivateKey = await keytar.getPassword(service, "account:fresh-bob");
if (!alicePrivateKey || !bobPrivateKey) throw new Error("Unlocked fresh-alice and fresh-bob keychain accounts are required.");

const alice = createAccount(alicePrivateKey);
const bob = createAccount(bobPrivateKey);
const aliceClient = createClient({ chain: chains.studionet, endpoint: rpc, account: alice });
const bobClient = createClient({ chain: chains.studionet, endpoint: rpc, account: bob });
const address = contractAddress;
const waitMs = 5000;
const maxPolls = 72;

function statusOf(receipt) { return String(receipt.statusName || receipt.status_name || receipt.status || "UNKNOWN").toUpperCase(); }
function hashOf(value) { return typeof value === "string" ? value : String(value?.hash || value?.tx_id || value?.transactionHash || ""); }
function executionOf(receipt) {
  const direct = receipt.txExecutionResultName || receipt.execution_result || receipt.executionResult;
  if (direct) return String(direct).toUpperCase();
  const leaders = receipt.consensus_data?.leader_receipt;
  const leader = Array.isArray(leaders) ? leaders[0] : leaders;
  return String(leader?.execution_result || "").toUpperCase();
}
async function waitForTerminal(client, hash) {
  let latest;
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    latest = await client.getTransaction({ hash });
    const status = statusOf(latest);
    const execution = executionOf(latest);
    if (["UNDETERMINED", "CANCELED", "CANCELLED"].includes(status)) return latest;
    if (status === "FINALIZED" && ["SUCCESS", "ERROR", "FINISHED_WITH_RETURN", "FINISHED_WITH_ERROR"].includes(execution)) return latest;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  throw new Error(`Timed out while reconciling ${hash}`);
}
async function write(client, functionName, args) {
  const raw = await client.writeContract({ address, functionName, args, value: 0n });
  const hash = hashOf(raw);
  if (!hash) throw new Error(`No transaction hash returned for ${functionName}`);
  const receipt = await waitForTerminal(client, hash);
  const status = statusOf(receipt);
  if (status !== "FINALIZED") throw new Error(`${functionName} ${hash} ended ${status}`);
  const execution = executionOf(receipt);
  if (execution !== "SUCCESS" && execution !== "FINISHED_WITH_RETURN") throw new Error(`${functionName} ${hash} finalized with ${execution || "UNKNOWN_EXECUTION_RESULT"}`);
  return { hash, receipt };
}
async function read(client, functionName, args) {
  return await client.readContract({ address, functionName, args });
}
function deadlines() { const now = Math.floor(Date.now() / 1000); return [now + 3600, now + 7200]; }
async function newEngagementId(beforeIds) {
  for (let attempt = 0; attempt < 36; attempt += 1) {
    const page = await read(aliceClient, "get_wallet_engagements", [alice.address, 0, 20]);
    const fresh = page.ids.map(String).filter((id) => !beforeIds.has(id));
    if (fresh.length > 0) return fresh.at(-1);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  throw new Error("Timed out while waiting for the newly created engagement to appear in Alice's wallet index");
}
async function create(title, summary, criteria, refs, expected) {
  const [proposal, delivery] = deadlines();
  const before = await read(aliceClient, "get_wallet_engagements", [alice.address, 0, 20]);
  const beforeIds = new Set(before.ids.map(String));
  const made = await write(aliceClient, "create_engagement", [bob.address, title, summary, criteria, criteria.map(() => true), proposal, delivery]);
  const id = await newEngagementId(beforeIds);
  const accepted = await write(bobClient, "accept_engagement", [id]);
  const submitted = await write(bobClient, "evaluate_attempt", [id, JSON.stringify(refs)]);
  const engagement = await read(aliceClient, "get_engagement", [id]);
  const attempts = await read(aliceClient, "get_attempts", [id, 0, 20]);
  const result = { expected, id, create: made.hash, accept: accepted.hash, evaluate: submitted.hash, status: engagement.status, productResult: engagement.latest_result, attemptCount: engagement.attempt_count, attemptResult: attempts.items.at(-1)?.result };
  console.log(JSON.stringify(result));
  if (expected && result.productResult !== expected) throw new Error(`${title}: expected ${expected}, got ${result.productResult}`);
  return result;
}

await create("Live accepted lifecycle", "Confirm two public Accordant production claims.", ["The Accordant production interface is publicly reachable.", "The Accordant production page identifies the Accordant milestone workflow."], [
  { criterion: 0, kind: "LIVE_DEPLOYMENT", url: "https://accordant.vercel.app/", note: "Production interface" },
  { criterion: 1, kind: "LIVE_DEPLOYMENT", url: "https://accordant.vercel.app/", note: "Production milestone page" },
], "ACCEPTED");

await create("Live revision lifecycle", "The evidence should clearly fail both frozen conditions.", ["The Accordant production page states that Accordant is a private accounting portal.", "The Accordant production page states that every milestone is settled by a bank transfer."], [
  { criterion: 0, kind: "LIVE_DEPLOYMENT", url: "https://accordant.vercel.app/", note: "Reachable page without the false claim" },
  { criterion: 1, kind: "LIVE_DEPLOYMENT", url: "https://accordant.vercel.app/", note: "Reachable page without the false claim" },
], "REVISION_REQUIRED");

await create("Live inconclusive lifecycle", "One source is intentionally unavailable to verify fail-closed behavior.", ["The requested proof source is reachable.", "The Accordant production interface is publicly reachable."], [
  { criterion: 0, kind: "PUBLIC_ARTIFACT", url: "https://accordant-invalid-evidence.invalid/proof", note: "Intentionally unavailable" },
  { criterion: 1, kind: "LIVE_DEPLOYMENT", url: "https://accordant.vercel.app/", note: "Production interface" },
], "INCONCLUSIVE");
