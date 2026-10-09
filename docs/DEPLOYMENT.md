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

- Current contract address: `0xd9a36f60D41bb343590274b9E905A314Ac6D55A6`.
- Deployment transaction: `0xc510662ea42ae15200d67a749b341c996f3f1d5974d9b977a793a16dc5f6a50a`.
- Deployment explorer: https://explorer-studio.genlayer.com/tx/0xc510662ea42ae15200d67a749b341c996f3f1d5974d9b977a793a16dc5f6a50a
- Deployment status: `FINALIZED`; result: `MAJORITY_AGREE`.
- Deployment source SHA-256: `CC0EC42ADA86145EA0308BD173FFBD3FCDB854BD0FB2C60C1886562CD00FCABA`.
- The final revision adds payable GEN escrow, frozen evidence policy, bounded challenges, explicit pending transfers, recipient confirmations, mutual closure, and GitHub-signature-verified immutable evidence provenance.
- Previous deployment addresses are superseded because the contract storage and economic state schema changed.
- The fresh schema includes role-specific pagination, escrow accounting, challenge history, closure state, and transfer-confirmation views.

The deployment command was:

```text
npm run cli -- deploy --contract contracts/accordant.py --rpc https://studio.genlayer.com/api
```

The unlocked `fresh-alice` account signed the deployment. The final receipt was queried again after deployment.

## Production frontend

- Production URL: https://accordant.vercel.app
- Vercel project: `bibidees-projects/accordant`.
- Production deployment: https://vercel.com/bibidees-projects/accordant/2jxcrQMDbsQB14TE3Bt92f9efTth (`READY`).
- Generated deployment URL: https://accordant-qmco1f3rp-bibidees-projects.vercel.app
- Production runtime source tree: protected-master merge commit `078bf033c7b8db72c0dc47c23d56e19cc859a6ff` (fresh production deployment `2jxcrQMDbsQB14TE3Bt92f9efTth`).
- `NEXT_PUBLIC_ACCORDANT_CONTRACT` is configured to the deployed address above.
- The app displays Studionet `61999`, the correct RPC, and the fresh contract binding on `/account`.

## Verification

The following checks passed locally:

- `npm run network:check` — Studionet 61999 only.
- `npm run typecheck`.
- `npm run lint`.
- `npm run test` — 47 UI tests, including strict transaction execution classification, fail-closed receipt refresh/monitor behavior, latest-first pagination boundaries, stale-account protection, role separation, canonical digest parity, concurrent attempt reconciliation, historical/latest attempt semantics, expiry reconciliation, pagination-count races, terminal transaction branches, finalized-unverified handling, finalized receipt refresh, and the active-only evidence-desk gate.
- `npm run build -- --webpack` — all required routes compiled.
- `npm audit --omit=dev --audit-level=high` — zero high-severity production vulnerabilities.
- Full `npm audit --audit-level=high` — `found 0 vulnerabilities` after isolating the deploy CLI, updating Vitest, and replacing the vulnerable Next ESLint bundle with ESLint 9-compatible maintained packages.
- Fresh `npm ci` — completed successfully with no Windows cleanup/EPERM warning.
- GitHub Actions uses Node 24-compatible `checkout@v7`, `setup-node@v7`, and `setup-python@v7` actions.
- `git diff --check`.
- Direct Mode — 16 contract tests passed against the pinned GenLayer test bundle, including escrow funding, pending payout/refund confirmation, challenges, policy enforcement, cryptographically verified GitHub commit/release provenance, unsigned-proof fail-closed behavior, Studionet receipt provenance, mutual closure, 121-record role/pagination, and malformed criterion cases. The GenLayer testing suite is pinned in `requirements-dev.txt`.
- Deployed schema query at `0xd9a36f60D41bb343590274b9E905A314Ac6D55A6`, including `get_performer_incoming`, separate accepted-work pagination, escrow accounting, challenge history, closure confirmation views, and stored authenticity proof metadata.
- Deployment receipt query — `FINALIZED` / `MAJORITY_AGREE`.
- GitHub signature smoke verification — [master commit `7a015567c2119ac36e7292d0aeb868dfb9ffbd1e`](https://github.com/Bibidee/accordant/commit/7a015567c2119ac36e7292d0aeb868dfb9ffbd1e) returned `verification.verified=true`, `reason=valid`, a non-empty PGP signature, signed payload, and `verified_at` timestamp through GitHub's commit API; unsigned or incomplete proof is rejected by the contract and Direct Mode.
- The protected master ruleset requires Web tests and production build, Direct Mode contract tests, Production dependency audit, and the Required CI gate. Protected-master workflow [37864155619](https://github.com/Bibidee/accordant/actions/runs/37864155619) passed all four jobs for merge commit `078bf033c7b8db72c0dc47c23d56e19cc859a6ff`.

The current production browser check opened `/`, `/work`, `/work/new`, `/activity`, and `/account`; each route rendered Accordant content, the account route showed Studionet `61999` and `0xd9a36f60D41bb343590274b9E905A314Ac6D55A6`, and no route had horizontal overflow. Exact interactive mobile QA was completed at `390×844`: all five routes rendered without horizontal overflow, and the responsive `Menu` opened and exposed the mobile navigation links.

## Final live two-wallet lifecycle (current contract)

On 2026-10-09, the unlocked CLI wallets `fresh-alice` (requester, `0x7C65cE913F5665c11f1219048112C84CD6cb2a4B`) and `fresh-bob` (performer, `0x2cd419603eBa593074653930Ddc4073d4FD8fc60`) ran the complete lifecycle suite against `0xd9a36f60D41bb343590274b9E905A314Ac6D55A6`. Escrow was `0.01 GEN` per engagement. The run ended with `lifecycle: all-passed`, accepted engagement `1`, five accepted-work records, and eight incoming records.

| Engagement | Scenario | Evidence and settlement | Final readback |
| ---: | --- | --- | --- |
| 1 | accepted + performer payout | create `0xbb8bc5034d63b9950a8c2ec0c3e46adb6def8847a041fddd2a68cfc1a2d286ac`; accept `0x870f7a071df5807a417750e7d1fd3f0954c15011c60e4b639c9ae95a1a44f0e4`; evaluate `0xad46f7c5466bff85f6819cb3aa7abb41d5a822237d20cf59f4859bf4ffcbc426`; payout + confirmation `0x38b70c6f7521a52f7f830ef4d8b01292e1ac10b63e55b32e8316a26505872edd`, `0x35f5e4fde976a002fc57ed9cd298d2beabc28886d6b339a1148e769abfd4f8bb` | `COMPLETED`, `ACCEPTED`, `PAYOUT_VERIFIED` |
| 2 | revision + retry | create `0xde066c80519ae83c47036ae7fd938afe439fffda39411844a70bb99a77476d83`; accept `0xac35622ba07ab8f7f7a5565c5095d547d7ac07d77e54da6f6c097ce7bf77cb12`; attempt 1 `0x38e3f59fa179e402e377324a52a322734d6ec6684ce5c782377c6a1f2a9e4399`; retry `0xb7ba737736ef9241e440e7c88e4b439c9bca80e177d4a52a0458ffa1a7e124c1` | `ACTIVE`, `REVISION_REQUIRED`, attempt 2, `HELD` |
| 3 | unavailable evidence | create `0xd244570af474f74bc050cdc1ae5141e007294f46bd2753a6783079afaa28b2ee`; accept `0x87185cfb9daed4054ba5f2411538427ec56d8cc30c2b8215a3bdf5e62f0a1955`; evaluate `0xe94a88955546f31cbef1c2587b4ce1e37c9f00486f6c9de95674d38f138b19f3` | `ACTIVE`, `INCONCLUSIVE`, `HELD` |
| 4 | performer decline + refund confirmation | create `0xb1af1f1e22684ad850ef938fbca66be40a22e78fc12484e31f2dbcdf66e3d570`; decline `0x5e6ab61c3c2bced9c0d314bd9552c43d6ee50363155fa84f5da1cb071b0812d5`; refund confirmation `0x79b79a4fadbfa42c6cb40f4e52b9d9b062ec849fd4d56a177abc809a4ce598ef` | `DECLINED`, `REFUNDED` |
| 5 | requester cancel + refund confirmation | create `0xf4af7db90a6fec3eecfe7f62172c5328d5d97052ece0ed257971d41924537775`; cancel `0xf4f82f5184c96cc53a87afcad0a04681d9ecbba2d06ce2050296dbc681c8dc87`; refund confirmation `0x99c98c79b22f32160b5843a32609259faee63671bff785a7f7c9a2bfb131aebe` | `CANCELLED`, `REFUNDED` |
| 6 | proposal expiry + refund confirmation | create `0x3410f90f08646166e76c2dc8ffd376185c23b462582031e352e44a11ddfc5e8b`; close expired `0x4c230ce512d0996c10c97bee6b2e6ae7ad8b8cbe14382a83f5c92998a9162fa9`; refund confirmation `0xbc4a1751bd04110ee7c31b063a96fee4b2d274925041c8d6da2942f640196cf8` | `EXPIRED`, `REFUNDED` |
| 7 | active delivery expiry + refund confirmation | create `0xd2183833c95244209966def7430cb98de94154d7b947806f02c10452c5f7d15b`; accept `0x6a6c4915ed92dbfb330fdc9f6dd532394195364cd16d9b63b0ccb7c1e2ff7b1a`; close expired `0xa0ef82f2b30ab736edf0fd1a9b45240603d92941410ec11f7a7ff831a6f72d56`; refund confirmation `0x05f2716abd7fa8c2b89d4a8357818f9c1c3077297ff14c1077a81b03895832ce` | `EXPIRED`, `REFUNDED` |
| 8 | mutual closure + two-sided confirmation | request `0x4fa53546f885d2eb2616f04634335b2e9984900952b34f91f9dee3386cbcdb7b`; requester confirmation `0x41130c7859107a4d6d0923dab9dc42d50e350bc15f2d3b13d9365b2f3f3ae222`; performer confirmation `0xa87ada774c7acf22b05446c7f6acf9c9fda0b41dd493243ef5f2176d371524d2` | `CLOSED`, `CLOSED_SETTLED` |

Every transaction finalized successfully. Pending payout/refund/closure transfers were not counted as settled until the intended recipient submitted the corresponding confirmation.

## Historical two-wallet CLI lifecycle (superseded contract)

The unlocked CLI wallets were `fresh-alice` (requester) and `fresh-bob` (performer). The hashes below target the superseded pre-economic deployment and are retained only as historical evidence; the final-address lifecycle is recorded separately below.

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

## Historical Brave production lifecycle (superseded contract)

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

## Historical Brave revision-recovery lifecycle (superseded contract)

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

The final deployable contract source hashes to `CC0EC42ADA86145EA0308BD173FFBD3FCDB854BD0FB2C60C1886562CD00FCABA` and is deployed at `0xd9a36f60D41bb343590274b9E905A314Ac6D55A6`. The protected-master release commit is `078bf033c7b8db72c0dc47c23d56e19cc859a6ff`; its four-job verification is [workflow run 37864155619](https://github.com/Bibidee/accordant/actions/runs/37864155619).

The `Protect master` repository ruleset is active (ID `24645498`) for `refs/heads/master`, blocking deletion and non-fast-forward updates and requiring Web, Direct Mode, production audit, and Required CI gate checks. GitHub shows all current commits authored and committed by Bibidee; no Codex-authored history rewrite was necessary.
