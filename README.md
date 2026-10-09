# ACCORDANT

ACCORDANT is a backendless GenLayer milestone-acceptance workspace. Two wallets agree to one delivery milestone and freeze 2–7 acceptance criteria before work begins. The performer later submits bounded public evidence. GenLayer validators independently inspect that evidence and determine whether each criterion is `MET`, `NOT_MET`, or `UNVERIFIABLE`. Deterministic contract logic derives the product outcome:

- every required criterion `MET` → `ACCEPTED`
- at least one required criterion `NOT_MET` → `REVISION_REQUIRED`
- no required criterion `NOT_MET`, but at least one required criterion `UNVERIFIABLE` → `INCONCLUSIVE`

`REVISION_REQUIRED` and `INCONCLUSIVE` keep the engagement active so the performer can submit a new append-only attempt. `ACCEPTED` opens a bounded challenge window before the performer can claim the funded payout.

## Why GenLayer

The important question is semantic rather than a simple oracle lookup: **does the submitted evidence actually demonstrate that the delivered work satisfies the acceptance criteria both parties froze before delivery?** The requester should not be able to reinterpret “done” after seeing the work, and the performer should not be able to self-certify completion. GenLayer supplies independent validator judgment and consensus around that bounded question.

## Architecture

```text
USER
  -> NEXT.JS APP ROUTER FRONTEND
  -> INJECTED EIP-1193 WALLET
  -> GENLAYER STUDIONET
  -> ACCORDANT INTELLIGENT CONTRACT
  -> VALIDATOR EVIDENCE RETRIEVAL + SEMANTIC JUDGMENT
  -> CANONICAL CONTRACT STATE
  -> FRONTEND
```

There is no application backend, server database, operator signer, cron worker, centralized AI service, admin adjudicator, authoritative API route, or off-chain outcome authority.

## Absolute network

- Network: GenLayer Studionet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- Repository-local GenLayer CLI: `0.39.1`

Never use a non-Studionet network.

## V1 roles

### Requester
Creates and funds the engagement, names the performer, writes the milestone and 2–7 criteria, marks criteria required/optional, freezes the evidence policy, and sets offer/delivery deadlines. Creating the proposal is the requester’s signed acceptance of those terms.

### Performer
Reviews the funded proposal and either accepts or declines. After acceptance the performer may submit append-only evidence attempts before the delivery deadline, challenge resolution, and payout confirmation.

### Validators
Independently retrieve only the evidence explicitly submitted for the attempt, treat external content as untrusted data, judge each criterion, and reproduce the consensus-critical criterion status vector.

## V1 state model

```text
PROPOSED -> ACTIVE -> COMPLETED -> CHALLENGE_WINDOW -> PAYOUT_TRANSFER_PENDING -> PAYOUT_VERIFIED
    |         |
    |         -> EXPIRED
    -> DECLINED
    -> CANCELLED
    -> EXPIRED

Any held/claimable balance may instead enter `REFUND_TRANSFER_PENDING`, `CLOSURE_PENDING`, or `CLOSURE_TRANSFER_PENDING`. Both recipients explicitly confirm emitted transfers before the final `REFUNDED`, `PAYOUT_VERIFIED`, or `CLOSED_SETTLED` accounting state.
```

Attempts do not replace engagement state with product outcomes. While `ACTIVE`, each attempt records one of:

- `ACCEPTED` → engagement becomes `COMPLETED`
- `REVISION_REQUIRED` → engagement remains `ACTIVE`
- `INCONCLUSIVE` → engagement remains `ACTIVE`

Protocol-level GenLayer transaction states such as `ACCEPTED`, `FINALIZED`, or `UNDETERMINED` are transaction lifecycle states and must never be conflated with ACCORDANT product outcomes.

## Economic model

Creation is payable and records the exact GEN amount in the frozen terms digest. Funds move through explicit `HELD`, `CLAIMABLE`, and pending-transfer states. The contract emits native GEN transfers only after deterministic authorization and amount checks; it does not mark a payout or refund as final until the recipient signs a confirmation. Participants may challenge an accepted result during the bounded challenge window, and both parties can request mutual closure over an exact allocation digest.

## Evidence model

Evidence is criterion-bound. The performer does not submit a generic evidence dump and the contract does not crawl the internet looking for proof.

V1 distinguishes current-state evidence from durable historical proof. A source policy can require durable evidence; in that mode mutable `PUBLIC_ARTIFACT` and `LIVE_DEPLOYMENT` references fail closed. Durable evidence uses provider-specific checks:

- commit-addressed GitHub source or commit pages whose repository owner and commit are verified through GitHub's repository and commit APIs
- tagged public releases whose repository, tag, release URL, and target commit are verified through GitHub's release API
- immutable transaction/explorer records whose Studionet explorer API receipt matches the transaction hash, finalized status, target contract, and frozen network metadata
- versioned public documents or artifacts

A live deployment URL can be supporting evidence for a criterion that explicitly asks about current reachability or current behavior, but a mutable page loading successfully is not historical proof. The contract stores the declared provenance metadata, provider proof digest, and fetched-content digest in the attempt's authenticity record. Those digests make a decision reproducible and auditable; they do not, by themselves, establish authenticity.

Unavailable, malformed, rate-limited, oversized, ambiguous, or genuinely insufficient evidence must become `UNVERIFIABLE` where appropriate. It must never silently become `NOT_MET`.

External evidence, code, comments, README files, page text and embedded prompts are untrusted DATA, never validator instructions.

## Frontend routes

- `/` — product landing and entry point
- `/work` — wallet-scoped engagements
- `/work/new` — create proposal
- `/work/[engagementId]` — engagement workspace and frozen criteria
- `/work/[engagementId]/submit` — submit criterion-bound evidence
- `/work/[engagementId]/review/[attemptId]` — attempt result and criterion decisions
- `/work/[engagementId]/history` — append-only attempt history
- `/activity` — wallet activity and transaction recovery
- `/account` — wallet/network/contract information

The visual direction is a professional delivery workspace, not a protocol console: warm spacious canvas, strong document column, narrow context rail, criterion sheets, evidence attachments, participant chips and an attempt ledger. Do not copy CharterLock’s protocol/specimen/semantic-firewall presentation or Patchbound’s engineering-workspace identity.

## Important transaction rule

A submitted transaction receiving GenLayer `ACCEPTED` must still be shown as provisional until finalization/execution and canonical contract readback confirm the expected state transition. If consensus becomes protocol `UNDETERMINED`, show that explicitly and do not manufacture or persist a product outcome.

## What this handoff is

This repository contains the hardened build, the finalized Studionet deployment record, and the production frontend at https://accordant.vercel.app. The current live contract is `0xd9a36f60D41bb343590274b9E905A314Ac6D55A6`; deployment, transfer-confirmation, signed GitHub provenance verification, and live lifecycle evidence are recorded in `docs/DEPLOYMENT.md`.

Read `BUILD_PROMPT.txt` before changing anything.

## Current repository status

The local build includes the real `genlayer-js` 1.1.8 adapter, injected-wallet writes, canonical reads, criterion-bound evidence forms, append-only history views, transaction-hash recovery, protocol/product-state separation, and the required routes. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for observed deployment and verification results.
