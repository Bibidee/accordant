# ACCORDANT Deployment Record

This file records facts observed while building, deploying, and verifying the current V1 handoff.

## Target

- Network: GenLayer Studionet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- Repository-local CLI: `0.39.1`
- `genlayer-js`: `1.1.8`

## Implementation

- Contract source: `contracts/accordant.py`.
- Frontend: Next.js App Router + TypeScript.
- Browser writes use the injected EIP-1193 provider through `genlayer-js`.
- Browser reads use GenLayer `gen_call` through the same adapter.
- Local storage contains only transaction recovery pointers; canonical engagement and attempt state is read from the contract.
- There is no application backend, database, server signer, API route, Server Action, queue, or centralized outcome service.
- Role-specific history indexes are page-addressable; public history reads do not require a connected wallet.

## Contract deployment

- Contract address: `0x838D981244760a4A70c315311908347DEc953e8B`.
- Deployment transaction: `0x8665e86628f5d5bf32e2fa86cddef7e38766bfef99da6c9ab54d7e87d9ca75dd`.
- Deployment explorer: https://explorer-studio.genlayer.com/tx/0x8665e86628f5d5bf32e2fa86cddef7e38766bfef99da6c9ab54d7e87d9ca75dd
- Deployment status: `FINALIZED`; result: `MAJORITY_AGREE`.
- Deployment source SHA-256: `172F9CC6FCFF713CA95BDBA60135A7074DB85AAF46C6D74D037D5F6DD90C3245`.
- Source commit used for the deployment: `a2fd218498f0505f0d8b2beca3589ecd81cfe7eb`.
- Schema was re-queried at the fresh address and includes the role-specific paginated engagement methods.

The deployment command was:

```text
node node_modules/genlayer/dist/index.js deploy --contract contracts/accordant.py --rpc https://studio.genlayer.com/api
```

The unlocked `fresh-alice` account signed the deployment. The final receipt was queried again after deployment.

## Production frontend

- Production URL: https://accordant.vercel.app
- Vercel project: `bibidees-projects/accordant`.
- Production deployment: https://vercel.com/bibidees-projects/accordant/Cap13Zbckj6ZbiKbRsbgyGy74UfE (`READY`).
- Generated deployment URL: https://accordant-l6usl1ysw-bibidees-projects.vercel.app
- `NEXT_PUBLIC_ACCORDANT_CONTRACT` is configured to the deployed address above.
- The app displays Studionet `61999`, the correct RPC, and the fresh contract binding on `/account`.

## Verification

The following checks passed locally:

- `npm run network:check` — Studionet 61999 only.
- `npm run typecheck`.
- `npm run lint`.
- `npm run test` — 5 UI tests.
- `npm run build` — all required routes compiled.
- `npm audit --omit=dev --audit-level=high` — zero high-severity production vulnerabilities.
- `git diff --check`.
- Direct Mode — 9 contract tests passed against the pinned GenVM `v0.2.16` bundle. The compatibility shim is in `tests/direct/conftest.py`; the GenLayer testing suite is pinned in `requirements-dev.txt`.
- Deployed schema query at `0x838D981244760a4A70c315311908347DEc953e8B`.
- Deployment receipt query — `FINALIZED` / `MAJORITY_AGREE`.

The production browser was checked on desktop for `/`, `/work`, `/work/new`, `/activity`, and `/account`. The production routes returned successfully, showed the intended wallet-not-connected/public-read states, and showed the fresh Studionet contract binding. The available browser automation exposed no exact viewport control, so the desktop check plus responsive production route/build checks are recorded here; exact `390x844` emulation remains a separate manual check.

## Live two-wallet lifecycle

The unlocked CLI wallets were `fresh-alice` (requester) and `fresh-bob` (performer). The final clean run used the deployed contract above and paginated both role-specific history indexes. It passed accepted, revision/retry, inconclusive, decline, cancel, and expiry paths:

| Engagement | Scenario | Result |
| ---: | --- | --- |
| 7 | accepted | `ACCEPTED` / `COMPLETED` |
| 8 | revision | `REVISION_REQUIRED` / `ACTIVE` |
| 9 | unavailable evidence | `INCONCLUSIVE` / `ACTIVE` |
| 10 | performer decline | `DECLINED` |
| 11 | requester cancel | `CANCELLED` |
| 12 | deadline expiry | `EXPIRED` |

The accepted path finalized create `0x8e09b6ec476880f508d1f057edfcad31badd262889f8fc327e68b24749a95e5f`, accept `0xfafe6275c3a53dca62cb0eb22d4be65b7857df24884235ebb989b66d3cd41bcb`, and evaluate `0x704afe96baa1a224c5b7284327719b7c2ca6b5ee27d6998c857ab769661a1a4b`. The revision path finalized retry `0x14aa1e3c4634853cb4ac67174c415b10c1a6609f3112bcc9e62b579b244d21f2` and read back `attemptCount: 2`.

## Remaining manual check

No deployment or contract verification action remains for the recorded V1 scope. If a release reviewer requires a literal `390x844` browser viewport screenshot, that must be performed in a viewport-capable browser session; the current automated browser surface did not expose that control.
