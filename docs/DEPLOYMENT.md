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

- Current contract address: `0x11dE514195AD2d3e534ab130B41B91682CD6dC0D`.
- Deployment transaction: `0xe8161c8149c50f04db347f7f5ede0e5236858f413f483d2276087b8a7312063e`.
- Deployment explorer: https://explorer-studio.genlayer.com/tx/0xe8161c8149c50f04db347f7f5ede0e5236858f413f483d2276087b8a7312063e
- Deployment status: `FINALIZED`; result: `MAJORITY_AGREE`.
- Deployment source SHA-256: `C98D0AC84862851542A6967F72D4961A84B024C6522977A615A53A73EC1C4E44`.
- The final revision adds payable GEN escrow, frozen evidence policy, bounded challenges, explicit pending transfers, recipient confirmations, mutual closure, and provider-verified immutable evidence provenance.
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
- Production deployment: https://vercel.com/bibidees-projects/accordant/FCvHMCTEzwrv94C7AtunDBBJmLQa (`READY`).
- Generated deployment URL: https://accordant-pzc28113t-bibidees-projects.vercel.app
- Production runtime source tree: fresh production deployment `FCvHMCTEzwrv94C7AtunDBBJmLQa`; protected-master commit will be recorded after the normal merge workflow.
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
- Direct Mode — 16 contract tests passed against the pinned GenLayer test bundle, including escrow funding, pending payout/refund confirmation, challenges, policy enforcement, GitHub commit/release provenance, Studionet receipt provenance, mutual closure, 121-record role/pagination, and malformed criterion cases. The GenLayer testing suite is pinned in `requirements-dev.txt`.
- Deployed schema query at `0x11dE514195AD2d3e534ab130B41B91682CD6dC0D`, including `get_performer_incoming`, separate accepted-work pagination, escrow accounting, challenge history, closure confirmation views, and stored authenticity proof metadata.
- Deployment receipt query — `FINALIZED` / `MAJORITY_AGREE`.
- The protected master ruleset requires Web tests and production build, Direct Mode contract tests, Production dependency audit, and the Required CI gate. Protected-master workflow [37830414750](https://github.com/Bibidee/accordant/actions/runs/37830414750) passed all four jobs for merge commit `130ab79077069b7fae242006a38c6fbcf860d82d`.

The current production browser check opened `/`, `/work`, `/work/new`, `/activity`, and `/account`; each route rendered Accordant content and Studionet `61999`, and `/account` showed `0x11dE514195AD2d3e534ab130B41B91682CD6dC0D`. The available in-app browser viewport was `1280×720` and reported no horizontal overflow. Exact interactive `390×844` mobile QA was not available in the current browser helper, so this record does not claim that specific mobile check.

## Final live two-wallet lifecycle (current contract)

On 2026-10-09, the unlocked CLI wallets `fresh-alice` (requester, `0x7C65cE913F5665c11f1219048112C84CD6cb2a4B`) and `fresh-bob` (performer, `0x2cd419603eBa593074653930Ddc4073d4FD8fc60`) ran the complete lifecycle suite against `0x11dE514195AD2d3e534ab130B41B91682CD6dC0D`. Escrow was `0.01 GEN` per engagement. The run ended with `lifecycle: all-passed`, accepted engagement `1`, five accepted-work records, and eight incoming records.

| Engagement | Scenario | Evidence and settlement | Final readback |
| ---: | --- | --- | --- |
| 1 | accepted + performer payout | create `0xe53d746838b3d4b4cc9a2276ba29be3ec03621edbf145665815001ed2d444a17`; accept `0x88deafa1b08c0ac3cd951296d11db7b6c0e6a205ee7ff84226bf8431f59d34e4`; evaluate `0xbb5947ccc6f31091e0751b1e7f1bc1f3f58ef7ae97a658ef394dd63420c98ea1`; payout + confirmation `0x19dd331eec457b6c51dcf6252f838e81db1f805e8527453c8c074666e35b3093`, `0x43a8aacda76621c7cd5896239bfe1e97e96dabe1891fb32c20f104239c816c0b` | `COMPLETED`, `ACCEPTED`, `PAYOUT_VERIFIED` |
| 2 | revision + retry | create `0xa3b874694ad20a4e64e794bfebae80703842d756e9b1070c1b99d549a28d0482`; accept `0xcb0f68afb7f6d13d4f1495cbfd1aa7848a207e96e8ce3e72c05b5b9dee1fcd85`; attempt 1 `0xcb765925e41b22d53473aba7301e18ab4ad3e59f2270c7354d0e26b6acb1659f`; retry `0x3cb6afd06e81480e26cbf85d450b894cc5ddf71c251fbde912ceb132548dcf79` | `ACTIVE`, `REVISION_REQUIRED`, attempt 2, `HELD` |
| 3 | unavailable evidence | create `0x5dcd85f02c63d7d22590b73ac8437d295c5b9a42fde112cf5cae4f604994d55a`; accept `0xe40157969d770b16d02939a309e09c9c88613084c3c06d8576394ab38e08e762`; evaluate `0x40a1a36ecf3b73c00a37df2f3fbdc904bed5110c42f8d71e44decb1913118880` | `ACTIVE`, `INCONCLUSIVE`, `HELD` |
| 4 | performer decline + refund confirmation | create `0xc672fdc3733ebabc7eb944fe86bf294aa567783a56e1595b04cda5ca0a1d47bb`; decline `0x411274009f47193b7afc06b47933e2d9fc021079b0bbf9902b7168974db90350`; refund confirmation `0x86603bc0c5b73b5efcee0223f05b4133b0774312c7933a91ecd3cb338359c5d9` | `DECLINED`, `REFUNDED` |
| 5 | requester cancel + refund confirmation | create `0x61d302f62fbbe0bdd1474669c3ca67ba2bc6d376375b88afbec78380e108c425`; cancel `0x36e00b5199f871831901793f9a83e542c5a2475b66b53f7a316b1a433be28e5b`; refund confirmation `0x01e2a38cc7a759ca67abdf937279797812f51c9ebbab87b6e1b5b3a795f47a63` | `CANCELLED`, `REFUNDED` |
| 6 | proposal expiry + refund confirmation | create `0xb01a60114fbbb3e9868aaadbef60aff3891725b355ab4dba0bd81be5d81770cc`; close expired `0x944addfa679413672b529c6ba165c10961ecb668c3a463f7888f4c6c6070ec61`; refund confirmation `0x912d644800f4d7b296cba6d114e919737b7fce3fc0f4565a3ec463517bc01d6` | `EXPIRED`, `REFUNDED` |
| 7 | active delivery expiry + refund confirmation | create `0xcbdc589775b81551dfe6a333bab37407849fefb75b9b27e92bb6c83ae674c481`; accept `0xfe95ab30fcdc5e02cef7a90658c2a55e5bd2c7f9bdb23a2bda578ce8815293c4`; close expired `0x83b2d1a3bfd99a48a5eea962fcbfda000e32aff76096d7b41f36045ba5d06650`; refund confirmation `0xb84ff51475fc682d5d5c16a19d2da5b914ff9083a34ecb76abb6452748acda52` | `EXPIRED`, `REFUNDED` |
| 8 | mutual closure + two-sided confirmation | request `0x8f073a6bc3d4b49d1c3ec5eb055494405693ed1b5a839b381c4027babf0724ba`; requester confirmation `0x6da27d09292ca90a45667464751d3dfdcb5e9a4a729db9b43ee87eb444741d0d`; performer confirmation `0x16b2594daebaced8f936013495cecf407353867a7892b11af29d475373085f64` | `CLOSED`, `CLOSED_SETTLED` |

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

The final deployable contract source hashes to `C98D0AC84862851542A6967F72D4961A84B024C6522977A615A53A73EC1C4E44` and is deployed at `0x11dE514195AD2d3e534ab130B41B91682CD6dC0D`. The protected-master release commit and its four-job verification will be recorded after the normal merge workflow.

The `Protect master` repository ruleset is active (ID `24645498`) for `refs/heads/master`, blocking deletion and non-fast-forward updates and requiring Web, Direct Mode, production audit, and Required CI gate checks. GitHub shows all current commits authored and committed by Bibidee; no Codex-authored history rewrite was necessary.
