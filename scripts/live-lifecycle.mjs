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
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function waitForTerminal(client, hash) {
  let latest;
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    try {
      latest = await client.getTransaction({ hash });
    } catch (error) {
      if (attempt === maxPolls - 1) throw error;
      await sleep(waitMs);
      continue;
    }
    const status = statusOf(latest);
    const execution = executionOf(latest);
    if (["UNDETERMINED", "CANCELED", "CANCELLED"].includes(status)) return latest;
    if (status === "FINALIZED" && ["SUCCESS", "ERROR", "FINISHED_WITH_RETURN", "FINISHED_WITH_ERROR"].includes(execution)) return latest;
    await sleep(waitMs);
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
  if (execution !== "SUCCESS" && execution !== "FINISHED_WITH_RETURN") throw new Error(`${functionName} finalized with ${execution || "UNKNOWN_EXECUTION_RESULT"}`);
  return { hash, receipt };
}

async function read(client, functionName, args) {
  return await client.readContract({ address, functionName, args });
}

async function allIds(client, functionName, wallet) {
  const ids = [];
  let offset = 0;
  for (let pageNumber = 0; pageNumber < 500; pageNumber += 1) {
    const page = await read(client, functionName, [wallet, offset, 20]);
    ids.push(...(page.ids || []).map(String));
    const next = Number(page.next_offset || 0);
    if (!next) return ids;
    offset = next;
  }
  throw new Error(`Pagination did not terminate for ${functionName}`);
}

async function walletIds(wallet) {
  const [requester, performer, incoming] = await Promise.all([
    allIds(aliceClient, "get_requester_engagements", wallet),
    allIds(aliceClient, "get_performer_engagements", wallet),
    allIds(aliceClient, "get_performer_incoming", wallet),
  ]);
  return [...new Set([...requester, ...performer, ...incoming])];
}

async function newEngagementId(beforeIds) {
  for (let attempt = 0; attempt < 72; attempt += 1) {
    const ids = await walletIds(alice.address);
    const fresh = ids.filter((id) => !beforeIds.has(id));
    if (fresh.length > 0) return fresh.at(-1);
    await sleep(waitMs);
  }
  throw new Error("Timed out while waiting for the newly created engagement to appear in the paged wallet indexes");
}

function deadlines(proposalSeconds = 3600, deliverySeconds = 7200) {
  const now = Math.floor(Date.now() / 1000);
  return [now + proposalSeconds, now + deliverySeconds];
}

async function create(title, summary, criteria, refs, expected) {
  const [proposal, delivery] = deadlines();
  const beforeIds = new Set(await walletIds(alice.address));
  const made = await write(aliceClient, "create_engagement", [bob.address, title, summary, criteria, criteria.map(() => true), proposal, delivery]);
  const id = await newEngagementId(beforeIds);
  const accepted = await write(bobClient, "accept_engagement", [id]);
  const submitted = await write(bobClient, "evaluate_attempt", [id, JSON.stringify(refs)]);
  const engagement = await read(aliceClient, "get_engagement", [id]);
  const attempts = await read(aliceClient, "get_attempts", [id, 0, 20]);
  const result = { expected, id, create: made.hash, accept: accepted.hash, evaluate: submitted.hash, status: engagement.status, productResult: engagement.latest_result, attemptCount: engagement.attempt_count, attemptResult: attempts.items?.at(-1)?.result };
  console.log(JSON.stringify(result));
  return result;
}

async function createUntil(title, summary, criteria, refs, expected) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = await create(`${title} probe ${attempt}`, summary, criteria, refs, expected);
    if (result.productResult === expected) return result;
  }
  throw new Error(`${title}: did not reach ${expected} after three fresh two-wallet probes`);
}

async function createProposal(title, proposalSeconds = 3600, deliverySeconds = proposalSeconds + 3600) {
  const [proposal, delivery] = deadlines(proposalSeconds, deliverySeconds);
  const beforeIds = new Set(await walletIds(alice.address));
  const made = await write(aliceClient, "create_engagement", [bob.address, title, "A lifecycle transition probe with public readback.", ["The transition is recorded in the public engagement state.", "The transition remains bound to the frozen terms."], [true, true], proposal, delivery]);
  return { id: await newEngagementId(beforeIds), create: made.hash, proposal };
}

const accepted = await createUntil("Live accepted lifecycle", "Confirm two public Accordant production claims.", ["The Accordant production interface is publicly reachable.", "The Accordant production page identifies the Accordant milestone workflow."], [
  { criterion: 0, kind: "LIVE_DEPLOYMENT", url: "https://accordant.vercel.app/", note: "Production interface" },
  { criterion: 1, kind: "LIVE_DEPLOYMENT", url: "https://accordant.vercel.app/", note: "Production milestone page" },
], "ACCEPTED");

const revision = await createUntil("Live revision lifecycle", "The evidence should clearly fail both frozen conditions.", ["The live page contains the exact sentence: Accordant is a private accounting portal.", "The live page contains the exact sentence: Every milestone is settled by a bank transfer."], [
  { criterion: 0, kind: "LIVE_DEPLOYMENT", url: "https://accordant.vercel.app/", note: "Exact phrase is intentionally absent" },
  { criterion: 1, kind: "LIVE_DEPLOYMENT", url: "https://accordant.vercel.app/", note: "Exact phrase is intentionally absent" },
], "REVISION_REQUIRED");

const revisionRetry = await write(bobClient, "evaluate_attempt", [revision.id, JSON.stringify([
  { criterion: 0, kind: "LIVE_DEPLOYMENT", url: "https://accordant.vercel.app/work", note: "Changed source path" },
  { criterion: 1, kind: "LIVE_DEPLOYMENT", url: "https://accordant.vercel.app/account", note: "Changed source path" },
])]);
const revisionReadback = await read(aliceClient, "get_engagement", [revision.id]);
console.log(JSON.stringify({ lifecycle: "revision-retry", id: revision.id, tx: revisionRetry.hash, status: revisionReadback.status, attemptCount: revisionReadback.attempt_count }));
if (Number(revisionReadback.attempt_count) !== 2) throw new Error("Revision retry did not append a second attempt");

await create("Live inconclusive lifecycle", "One source is intentionally unavailable to verify fail-closed behavior.", ["The requested proof source is reachable.", "The Accordant production interface is publicly reachable."], [
  { criterion: 0, kind: "PUBLIC_ARTIFACT", url: "https://accordant-invalid-evidence.invalid/proof", note: "Intentionally unavailable" },
  { criterion: 1, kind: "LIVE_DEPLOYMENT", url: "https://accordant.vercel.app/", note: "Production interface" },
], "INCONCLUSIVE");

const declined = await createProposal("Live decline lifecycle");
const declinedTx = await write(bobClient, "decline_engagement", [declined.id]);
const declinedReadback = await read(aliceClient, "get_engagement", [declined.id]);
const declinedResult = { lifecycle: "declined", id: declined.id, create: declined.create, decline: declinedTx.hash, status: declinedReadback.status, productResult: declinedReadback.latest_result, attemptCount: declinedReadback.attempt_count };
console.log(JSON.stringify(declinedResult));
if (declinedReadback.status !== "DECLINED") throw new Error("Decline lifecycle readback failed");

const canceled = await createProposal("Live cancel lifecycle");
const canceledTx = await write(aliceClient, "cancel_proposal", [canceled.id]);
const canceledReadback = await read(aliceClient, "get_engagement", [canceled.id]);
const canceledResult = { lifecycle: "canceled", id: canceled.id, create: canceled.create, cancel: canceledTx.hash, status: canceledReadback.status, productResult: canceledReadback.latest_result, attemptCount: canceledReadback.attempt_count };
console.log(JSON.stringify(canceledResult));
if (canceledReadback.status !== "CANCELLED") throw new Error("Cancel lifecycle readback failed");

const expired = await createProposal("Live proposal expiry lifecycle", 20, 60);
await sleep(25000);
const expiredTx = await write(aliceClient, "close_expired", [expired.id]);
const expiredReadback = await read(aliceClient, "get_engagement", [expired.id]);
const expiredResult = { lifecycle: "proposal-expired", id: expired.id, create: expired.create, expire: expiredTx.hash, status: expiredReadback.status, productResult: expiredReadback.latest_result, attemptCount: expiredReadback.attempt_count };
console.log(JSON.stringify(expiredResult));
if (expiredReadback.status !== "EXPIRED") throw new Error("Proposal expiry lifecycle readback failed");

const activeExpired = await createProposal("Live active delivery expiry lifecycle", 180, 210);
const activeAcceptedTx = await write(bobClient, "accept_engagement", [activeExpired.id]);
const activeBeforeExpiry = await read(aliceClient, "get_engagement", [activeExpired.id]);
if (activeBeforeExpiry.status !== "ACTIVE") throw new Error("Active delivery expiry did not reach ACTIVE");
await sleep(215000);
const activeExpiredTx = await write(aliceClient, "close_expired", [activeExpired.id]);
const activeExpiredReadback = await read(aliceClient, "get_engagement", [activeExpired.id]);
const activeExpiredResult = { lifecycle: "active-delivery-expired", id: activeExpired.id, create: activeExpired.create, accept: activeAcceptedTx.hash, expire: activeExpiredTx.hash, status: activeExpiredReadback.status, productResult: activeExpiredReadback.latest_result, attemptCount: activeExpiredReadback.attempt_count };
console.log(JSON.stringify(activeExpiredResult));
if (activeExpiredReadback.status !== "EXPIRED") throw new Error("Active delivery expiry lifecycle readback failed");

const acceptedIndex = await read(bobClient, "get_performer_engagements", [bob.address, 0, 20]);
const incomingIndex = await read(bobClient, "get_performer_incoming", [bob.address, 0, 20]);
if (!(acceptedIndex.ids || []).map(String).includes(String(accepted.id)) || !(incomingIndex.ids || []).map(String).includes(String(activeExpired.id))) throw new Error("Role-specific performer indexes did not contain the expected canonical records");
console.log(JSON.stringify({ contract: address, alice: alice.address, bob: bob.address, lifecycle: "all-passed", accepted: accepted.id, acceptedWorkCount: acceptedIndex.total, incomingCount: incomingIndex.total }));
