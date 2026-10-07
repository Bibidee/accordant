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
- Requester-created, performer-incoming, and performer-accepted indexes are separate, append-only, page-addressable contract views.
- The `/work` route reads one bounded latest-first page of each role-specific view at a time and requires explicit `Load older` actions for older pages.
- Latest windows are calculated from each index total; final partial pages use the exact remaining limit so records are neither skipped nor duplicated.
- Pagination commits are guarded by both the wallet used for the request and a request-generation counter, so stale account reads cannot contaminate a newly selected wallet.

## Contract deployment

- Current contract address: `0x5C0D3125B030cA113B3c8866AE6f6B4B742F1e0E`.
- Deployment transaction: `0x50d46f35e463bfe6521f3d4c235424285258d6de535acc978b3431c54ecf887c`.
- Deployment explorer: https://explorer-studio.genlayer.com/tx/0x50d46f35e463bfe6521f3d4c235424285258d6de535acc978b3431c54ecf887c
- Deployment status: `FINALIZED`; result: `MAJORITY_AGREE`.
- Deployment source SHA-256: `D730EBB1574BEEEC501C3FA4C29016C00DFFB831A8D345D50642744903381EA4`.
- Source commit used for the deployment: `48281c7df1af71086017c7425c0315cf195f2510`.
- The previous address `0x838D981244760a4A70c315311908347DEc953e8B` is superseded because the contract storage/index schema changed.
- Schema was re-queried at the fresh address and includes the role-specific paginated engagement methods.

The deployment command was:

```text
node node_modules/genlayer/dist/index.js deploy --contract contracts/accordant.py --rpc https://studio.genlayer.com/api
```

The unlocked `fresh-alice` account signed the deployment. The final receipt was queried again after deployment.

## Production frontend

- Production URL: https://accordant.vercel.app
- Vercel project: `bibidees-projects/accordant`.
- Production deployment: https://vercel.com/bibidees-projects/accordant/9zaZrc6229GMYvzXB8JaaJZxEUfc (`READY`).
- Generated deployment URL: https://accordant-66gk1i1lm-bibidees-projects.vercel.app
- `NEXT_PUBLIC_ACCORDANT_CONTRACT` is configured to the deployed address above.
- The app displays Studionet `61999`, the correct RPC, and the fresh contract binding on `/account`.

## Verification

The following checks passed locally:

- `npm run network:check` — Studionet 61999 only.
- `npm run typecheck`.
- `npm run lint`.
- `npm run test` — 17 UI tests, including latest-first pagination boundaries, stale-account protection, role separation, canonical digest parity, attempt matching, terminal transaction branches, and finalized receipt refresh.
- `npm run build` — all required routes compiled.
- `npm audit --omit=dev --audit-level=high` — zero high-severity production vulnerabilities.
- Full `npm audit --audit-level=high` — 10 development-tree vulnerabilities (3 moderate, 5 high, 2 critical) remain in Vitest/tinypool, braces through Next ESLint tooling, and dockerode’s nested uuid. No `npm audit fix --force` was applied because the suggested fixes include breaking dependency changes.
- `git diff --check`.
- Direct Mode — 9 contract tests passed against the pinned GenVM `v0.2.16` bundle, including 121-record role/pagination and malformed criterion cases. The compatibility shim is in `tests/direct/conftest.py`; the GenLayer testing suite is pinned in `requirements-dev.txt`.
- Deployed schema query at `0x5C0D3125B030cA113B3c8866AE6f6B4B742F1e0E`, including `get_performer_incoming` and separate accepted-work pagination.
- Deployment receipt query — `FINALIZED` / `MAJORITY_AGREE`.

The production URLs `/`, `/work`, `/work/new`, `/activity`, and `/account` returned successfully after the fresh deployment. The production build has responsive breakpoints and no horizontal overflow in the bounded desktop layout checks. The Windows browser automation helper failed to initialize during this pass, so an exact interactive `390x844` viewport check was not performed and is explicitly not claimed.

## Live two-wallet lifecycle

The unlocked CLI wallets were `fresh-alice` (requester) and `fresh-bob` (performer). All hashes below target the current contract above and were finalized before canonical readback. The captured evidence covers every required path:

| Engagement | Scenario | Result |
| ---: | --- | --- |
| 1 | accepted | `ACCEPTED` / `COMPLETED`, attempt 1 |
| 2 | revision + retry | `REVISION_REQUIRED` / `ACTIVE`, attempt 2 |
| 3 | unavailable evidence | `INCONCLUSIVE` / `ACTIVE`, attempt 1 |
| 4 | performer decline | `DECLINED`, attempt 0 |
| 5 | requester cancel | `CANCELLED`, attempt 0 |
| 6 | proposal expiry | `EXPIRED`, attempt 0 |
| 14 | active delivery expiry | `EXPIRED`, attempt 0 |

### Accepted

- Engagement `1`; create `0x084bdce512f6b9d1dd3d2bb4bcd0943f5be4ff2af6c855e03afe93b7d1605b2f`; accept `0x99e0a91a0f98a00330455813c4808383727260d19cb94cb0e014e9ad45ef5379`; evaluate `0x97bd90538a48a8ed915a1d5b1f051ee30aec305123fa5e73e8be146b07a65d4f`; final `COMPLETED` / `ACCEPTED`, attempt 1.

### Revision required and retry

- Engagement `2`; create `0xd0351994b03b7c574ab795c8d9f24e0b7298baa7eaa1e186a5745f05641fb1c6`; accept `0x59f928b6c11d09da439031c9b4d84a7afe36e336cf54505d2624b4d05303e824`; evaluate `0xe71d7db7dfe9620225292087ac1a053f6687429c9ea59021a7223ddc1e08d786`; retry `0x4145e78269cc91c811df94ca1568c116700a0d80c64a879cbbf48e95b6244e65`; final `ACTIVE` / `REVISION_REQUIRED`, attempt 2.

### Inconclusive

- Engagement `3`; create `0xdf773052daf569a3e837e4a3beca898721eb5cfb7232f19cc1b1dee703ff9629`; accept `0x9d697c425adbd9f55b44b22b5b090717fefafa4ddcaccfa9c72651dc32790d50`; evaluate `0xeb8ff02d9b30e7511af06422b4bdf8e6af9c5cd0727c7e1eb819229739fba396`; final `ACTIVE` / `INCONCLUSIVE`, attempt 1.

### Declined

- Engagement `4`; create `0x09ca5d4eeeb3a73eca8b8d7e3d585ef1724b6afa8480dd0b19d636125e3f9594`; decline `0x01c1d4f4e252246f65f5277ea052085d54a62bb898ce087811a3e2a6da54b3e1`; final `DECLINED`, attempt 0.

### Cancelled

- Engagement `5`; create `0x61d50cb59e0dd465eb4368ba398a1f4b43333c4a0faa8f2df9253d287df990b2`; cancel `0x88f7fe45e60003b5e55a1ffa48e662ab53e4ea1ae5b216b55f77c15884f65585`; final `CANCELLED`, attempt 0.

### Proposal expired

- Engagement `6`; create `0x98c8b4133235fd597c6f98aaa95bb8229886ba6763659813d7c4dc9a3d05ab26`; close-expired `0xa2d4187294c6af7d83851786b47add7bd77349f323d3eb67423b304e77016fb5`; final `EXPIRED`, attempt 0.

### Active delivery expired

- Engagement `14`; create `0x7fdeebc11212f914df590638bf4150496f0aebf9fe7609b77663f40075ffa9df`; accept `0xcb2b58074f9bc4dd79e853f529ddc89c583bee6f71ad993a1c9c223c4f5a4da8`; close-expired `0x9124715bcbd443e7549d61715d394badca6297176937350e74f1389fb52628c8`; final `EXPIRED`, attempt 0.

## Provenance and remaining manual check

The deployable contract source at commit `48281c7df1af71086017c7425c0315cf195f2510` hashes to `D730EBB1574BEEEC501C3FA4C29016C00DFFB831A8D345D50642744903381EA4`. Later changes are frontend pagination/canonical verification, tests, documentation, environment binding, and lifecycle-runner cleanup; `contracts/accordant.py` is unchanged after that deployment commit. No contract redeployment was required.

The only unperformed verification is the exact interactive `390x844` browser viewport check because the Windows browser automation helper failed to initialize. No contract or lifecycle evidence is being fabricated for that gap.
