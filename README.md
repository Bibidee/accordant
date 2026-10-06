# ACCORDANT

ACCORDANT is a backendless GenLayer milestone-acceptance workspace. Two wallets agree to one delivery milestone and freeze 2–7 acceptance criteria before work begins. The performer later submits bounded public evidence. GenLayer validators independently inspect that evidence and determine whether each criterion is `MET`, `NOT_MET`, or `UNVERIFIABLE`. Deterministic contract logic derives the product outcome:

- every required criterion `MET` → `ACCEPTED`
- at least one required criterion `NOT_MET` → `REVISION_REQUIRED`
- no required criterion `NOT_MET`, but at least one required criterion `UNVERIFIABLE` → `INCONCLUSIVE`

`REVISION_REQUIRED` and `INCONCLUSIVE` keep the engagement active so the performer can submit a new append-only attempt. `ACCEPTED` is terminal for V1.

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

Never use Studio-dev or chain `61997`.

## V1 roles

### Requester
Creates the engagement, names the performer, writes the milestone and 2–7 criteria, marks criteria required/optional, and sets offer/delivery deadlines. Creating the proposal is the requester’s signed acceptance of those terms.

### Performer
Reviews the frozen proposal and either accepts or declines. After acceptance the performer may submit append-only evidence attempts before the delivery deadline.

### Validators
Independently retrieve only the evidence explicitly submitted for the attempt, treat external content as untrusted data, judge each criterion, and reproduce the consensus-critical criterion status vector.

## V1 state model

```text
PROPOSED -> ACTIVE -> COMPLETED
    |         |
    |         -> EXPIRED
    -> DECLINED
    -> CANCELLED
    -> EXPIRED
```

Attempts do not replace engagement state with product outcomes. While `ACTIVE`, each attempt records one of:

- `ACCEPTED` → engagement becomes `COMPLETED`
- `REVISION_REQUIRED` → engagement remains `ACTIVE`
- `INCONCLUSIVE` → engagement remains `ACTIVE`

Protocol-level GenLayer transaction states such as `ACCEPTED`, `FINALIZED`, or `UNDETERMINED` are transaction lifecycle states and must never be conflated with ACCORDANT product outcomes.

## Evidence model

Evidence is criterion-bound. The performer does not submit a generic evidence dump and the contract does not crawl the internet looking for proof.

V1 should prefer stable or version-addressed public evidence such as:

- commit-addressed GitHub source or commit pages
- tagged public releases
- immutable transaction/explorer records
- versioned public documents or artifacts

A live deployment URL can be supporting evidence, but a mutable page loading successfully is not sufficient proof by itself unless the criterion actually asks only for that fact.

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

This repository is a **locally integrated build**, not a claim of completed deployment. It contains the frozen product specification, security rules, implementation source and exhaustive build prompt. Deployment and live lifecycle evidence remain blocked on the configured signer and production browser environment; no placeholder is presented as evidence.

Read `BUILD_PROMPT.txt` before changing anything.

## Current repository status

The local build includes the real `genlayer-js` 1.1.8 adapter, injected-wallet writes, canonical reads, criterion-bound evidence forms, append-only history views, transaction-hash recovery, protocol/product-state separation, and the required routes. It does not claim a deployed contract or production URL: the deployment attempt stopped at the configured keystore password prompt. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for observed verification results and exact remaining human actions.
