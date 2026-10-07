# ACCORDANT Deployment Record

This file records facts observed while building, deploying, and verifying the current V1 handoff.

## Target

- Network: GenLayer Studionet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- CLI package used for future deploys: `0.39.1` via `npm run cli`
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
- Latest-page reads probe the count, compare it with the returned page total, and recalculate the latest window once when a concurrent append is detected; the bounded read budget is one count probe plus at most two page reads.
- Evidence submission records the pre-write attempt count and exact digest/evidence JSON, then scans only appended attempts in bounded pages. It requires one unique canonical match and applies separate latest-attempt and historical-attempt state rules.

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
npm run cli -- deploy --contract contracts/accordant.py --rpc https://studio.genlayer.com/api
```

The unlocked `fresh-alice` account signed the deployment. The final receipt was queried again after deployment.

## Production frontend

- Production URL: https://accordant.vercel.app
- Vercel project: `bibidees-projects/accordant`.
- Production deployment: https://vercel.com/bibidees-projects/accordant/5x8zKFQPwjUh7YeyrYz1Nx7YKHKW (`READY`).
- Generated deployment URL: https://accordant-ola7nj1t3-bibidees-projects.vercel.app
- Production runtime source tree: protected-master merge `f5c9f5297b98dc4bb1aa3ae22f7d6f23480599f2`.
- `NEXT_PUBLIC_ACCORDANT_CONTRACT` is configured to the deployed address above.
- The app displays Studionet `61999`, the correct RPC, and the fresh contract binding on `/account`.

## Verification

The following checks passed locally:

- `npm run network:check` — Studionet 61999 only.
- `npm run typecheck`.
- `npm run lint`.
- `npm run test` — 45 UI tests, including strict transaction execution classification, fail-closed receipt refresh/monitor behavior, latest-first pagination boundaries, stale-account protection, role separation, canonical digest parity, concurrent attempt reconciliation, historical/latest attempt semantics, expiry reconciliation, pagination-count races, terminal transaction branches, finalized receipt refresh, and the active-only evidence-desk gate.
- `npm run build -- --webpack` — all required routes compiled.
- `npm audit --omit=dev --audit-level=high` — zero high-severity production vulnerabilities.
- Full `npm audit --audit-level=high` — `found 0 vulnerabilities` after isolating the deploy CLI, updating Vitest, and replacing the vulnerable Next ESLint bundle with ESLint 9-compatible maintained packages.
- Fresh `npm ci` — completed successfully with no Windows cleanup/EPERM warning.
- GitHub Actions uses Node 24-compatible `checkout@v7`, `setup-node@v7`, and `setup-python@v7` actions.
- `git diff --check`.
- Direct Mode — 9 contract tests passed against the pinned GenVM `v0.2.16` bundle, including 121-record role/pagination and malformed criterion cases. The compatibility shim is in `tests/direct/conftest.py`; the GenLayer testing suite is pinned in `requirements-dev.txt`.
- Deployed schema query at `0x5C0D3125B030cA113B3c8866AE6f6B4B742F1e0E`, including `get_performer_incoming` and separate accepted-work pagination.
- Deployment receipt query — `FINALIZED` / `MAJORITY_AGREE`.
- The protected master ruleset requires Web tests and production build, Direct Mode contract tests, Production dependency audit, and the Required CI gate. Latest successful master CI run at this verification: `37637054891` (`a684b35bb98a962efd294b3419c3bddca985e5e8`).

The production URLs `/`, `/work`, `/work/new`, `/activity`, `/account`, `/work/1`, `/work/1/history`, `/work/1/review/1`, and `/work/1/submit` returned HTTP 200 after the frontend deployment. `/account` contained Studionet, chain `61999`, and the current contract address. The exact interactive mobile check passed in Edge at `390×844`: all nine routes returned HTTP 200, each had no horizontal overflow, and the Work navigation link changed the route to `/work`.

## Historical two-wallet CLI lifecycle

The unlocked CLI wallets were `fresh-alice` (requester) and `fresh-bob` (performer). All hashes below target the current contract above and were finalized before canonical readback. This is historical CLI evidence, recorded separately from the fresh Brave injected-wallet production proofs. The captured evidence covers every required path:

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

## Fresh Brave production lifecycle

- Status: `COMPLETED` on 2026-10-07 using the public production site in Brave.
- Environment: two injected wallets on GenLayer Studionet `61999`; Wallet A was the requester and Wallet B was the performer.
- Wallet A / requester: `0xff203bb65942f50cb81a8af98c5f5bd9d8a79b54`.
- Wallet B / performer: `0x3c4c71D8C449471acC31AD59187231001856655C`.
- Agreement `15`, titled `Accordant Brave lifecycle`, was created with two required criteria: the production app must be reachable, and the public GitHub source repository must be reachable.
- Create transaction: `0x2bb27a573d566dbc9e893e85921df2b5e887f3405902a8e89bd73f38fa24e51a`.
- Accept transaction: `0xde92806357e7f29ed410ac53f90bdf2bf99a977b8e55cf6db8604ff859d2be46`.
- Evidence attempt 1 intentionally used invalid sources and finalized `INCONCLUSIVE`: `0x9a64c33d10a7a6f31c91e48a91d0f388ee2abb81c464ef245bdabae92ab0ad91`.
- Evidence attempt 2 used the live deployment and repository homepage and finalized `INCONCLUSIVE` because the validator could not read a bounded source reference: `0x1bab62dbdfee89d18f1b93944bfae79fe1709e1f5f4d846598050ff56b664190`.
- Evidence attempt 3 used `https://accordant.vercel.app/account` and the public raw repository source `https://raw.githubusercontent.com/Bibidee/accordant/master/docs/DEPLOYMENT.md`; it finalized and was canonically verified as `ACCEPTED`: `0xa4461b309b08ab94018aeb4f83541e262933fdade753ca65ca4d676c5281da60`.
- Final review matrix: both criteria `MET`; agreement state `COMPLETED`; append-only ledger: 3 attempts, latest result `ACCEPTED`.
- Brave dashboard verification showed Agreement `15` in both incoming history and accepted performer work after canonical reconciliation.

This records the fresh Brave injected-wallet lifecycle separately from the historical CLI lifecycle above. The earlier exact interactive mobile check remains recorded for Edge at `390×844`.

## Fresh Brave revision-recovery lifecycle

- Status: `COMPLETED` on 2026-10-07 using the public production site in Brave.
- Environment: two injected wallets on GenLayer Studionet `61999`; Wallet A was the requester and Wallet B was the performer.
- Wallet A / requester: `0xff203bb65942f50cb81a8af98c5f5bd9d8a79b54`.
- Wallet B / performer: `0x3c4c71D8C449471acC31AD59187231001856655C`.
- Agreement `16`, titled `ACCORDANT-BRAVE-REVISION-RECOVERY-20261007-1355`, used the same engagement for both attempts and had two required criteria:
  1. `The submitted versioned public artifact must contain the exact line: STATUS: COMPLETE`
  2. `The submitted versioned public artifact must contain the exact line: ACCORDANT_RECOVERY: READY`
- Create transaction: [0x6a551943abbf50eb744d2376a1f974ed2613e4aa78ee7c5404a53c2fa60fc3a5](https://explorer-studio.genlayer.com/tx/0x6a551943abbf50eb744d2376a1f974ed2613e4aa78ee7c5404a53c2fa60fc3a5); canonical state `PROPOSED`.
- Accept transaction: [0x23da5693cd7ad04b19dbef4d5c4443049e3d90330912668623b51900ce08207d](https://explorer-studio.genlayer.com/tx/0x23da5693cd7ad04b19dbef4d5c4443049e3d90330912668623b51900ce08207d); canonical state `ACTIVE`.

| Step | Transaction | Result | Canonical state |
| --- | --- | --- | --- |
| Create | [0x6a551943…](https://explorer-studio.genlayer.com/tx/0x6a551943abbf50eb744d2376a1f974ed2613e4aa78ee7c5404a53c2fa60fc3a5) | `FINALIZED` / `FINISHED_WITH_RETURN` | `PROPOSED` |
| Accept | [0x23da5693…](https://explorer-studio.genlayer.com/tx/0x23da5693cd7ad04b19dbef4d5c4443049e3d90330912668623b51900ce08207d) | `FINALIZED` / `FINISHED_WITH_RETURN` | `ACTIVE` |
| Attempt 1 | [0x36bb35ff…](https://explorer-studio.genlayer.com/tx/0x36bb35ffe24d7478cbb3907d02545a37ef0b712c06483bf5a8d421b9665509cc) | `REVISION_REQUIRED`; both criteria `NOT_MET` | `ACTIVE` |
| Attempt 2 | [0x60e2b236…](https://explorer-studio.genlayer.com/tx/0x60e2b2368c419f4b928768b0746b264f54f22672fe60787664017f9d5a8cefc5) | `ACCEPTED`; both criteria `MET` | `COMPLETED` |

Attempt 1 used immutable Version A evidence at commit `c7b07ecf7c5823a28bca24c88ed6277881664cab`:
`https://raw.githubusercontent.com/Bibidee/accordant/c7b07ecf7c5823a28bca24c88ed6277881664cab/accordant-recovery-proof.txt`

Attempt 2 used immutable Version B evidence at commit `c08f81cd0bedc149c0dfb0b3655d87c6fe8961bb`:
`https://raw.githubusercontent.com/Bibidee/accordant/c08f81cd0bedc149c0dfb0b3655d87c6fe8961bb/accordant-recovery-proof.txt`

The canonical attempt ledger contains exactly two attempts: attempt 1 is `REVISION_REQUIRED` with both criteria `NOT_MET`, and attempt 2 is `ACCEPTED` with both criteria `MET`. The final agreement page reports `COMPLETED` / `ACCEPTED`. Terminal-state QA also verified that the agreement page exposes no cancellation or submission action after completion; the evidence route now renders a closed terminal state instead of an append form.

## Provenance and verification notes

The deployable contract source at commit `48281c7df1af71086017c7425c0315cf195f2510` hashes to `D730EBB1574BEEEC501C3FA4C29016C00DFFB831A8D345D50642744903381EA4`. Later changes are frontend pagination/canonical verification, tests, documentation, environment binding, lifecycle-runner cleanup, dependency remediation, and CI runtime hardening; the concurrent-attempt and page-race frontend fix is in commit `738f1ef11ebb7b56793cfbd6fd8d02663392648a`, and the final dependency/CI remediation is in `022fc21c82e467bdfb62d95d19a426102f5cf7da`; `contracts/accordant.py` is unchanged after that deployment commit. No contract redeployment was required.

The `Protect master` repository ruleset is active (ID `24645498`) for `refs/heads/master`, blocking deletion and non-fast-forward updates and requiring Web, Direct Mode, production audit, and Required CI gate checks. GitHub shows all current commits authored and committed by Bibidee; no Codex-authored history rewrite was necessary.
