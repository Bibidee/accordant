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

- Current contract address: `0xc9eCe9f1AF8De797d27836de4Ad8599d813aA620`.
- Deployment transaction: `0xd4d089eae93409b9c89362a8bc19cd60c6a68565308a2cbcb3efd69521aafba4`.
- Deployment explorer: https://explorer-studio.genlayer.com/tx/0xd4d089eae93409b9c89362a8bc19cd60c6a68565308a2cbcb3efd69521aafba4
- Deployment status: `FINALIZED`; result: `MAJORITY_AGREE`.
- Deployment source SHA-256: `B687E24AD9FCEBAC8D9A9E1FEDEE614C2E2E12550BA1C478CBCDDAAB7EB5EA05`.
- The final revision adds payable GEN escrow, frozen evidence policy, bounded challenges, explicit pending transfers, recipient confirmations, and mutual closure.
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
- Production deployment: https://vercel.com/bibidees-projects/accordant/C213fDVxVosBVYHo7rLYSkvJZWvM (`READY`).
- Generated deployment URL: https://accordant-rawvf15hk-bibidees-projects.vercel.app
- Production runtime source tree: protected-master release commit `130ab79077069b7fae242006a38c6fbcf860d82d` (implementation commit `88bc632`).
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
- Direct Mode — 13 contract tests passed against the pinned GenLayer test bundle, including escrow funding, pending payout/refund confirmation, challenges, policy enforcement, mutual closure, 121-record role/pagination, and malformed criterion cases. The GenLayer testing suite is pinned in `requirements-dev.txt`.
- Deployed schema query at `0xc9eCe9f1AF8De797d27836de4Ad8599d813aA620`, including `get_performer_incoming`, separate accepted-work pagination, escrow accounting, challenge history, and closure confirmation views.
- Deployment receipt query — `FINALIZED` / `MAJORITY_AGREE`.
- The protected master ruleset requires Web tests and production build, Direct Mode contract tests, Production dependency audit, and the Required CI gate. Protected-master workflow [37830414750](https://github.com/Bibidee/accordant/actions/runs/37830414750) passed all four jobs for merge commit `130ab79077069b7fae242006a38c6fbcf860d82d`.

The current production browser check opened `/`, `/work`, `/work/new`, `/activity`, and `/account`; each route rendered Accordant content and Studionet `61999`, and `/account` showed `0xc9eCe9f1AF8De797d27836de4Ad8599d813aA620`. The available in-app browser viewport was `1280×720` and reported no horizontal overflow. Exact interactive `390×844` mobile QA was not available in the current browser helper, so this record does not claim that specific mobile check.

## Final live two-wallet lifecycle (current contract)

On 2026-10-08, the unlocked CLI wallets `fresh-alice` (requester, `0x7C65cE913F5665c11f1219048112C84CD6cb2a4B`) and `fresh-bob` (performer, `0x2cd419603eBa593074653930Ddc4073d4FD8fc60`) ran the complete lifecycle suite against `0xc9eCe9f1AF8De797d27836de4Ad8599d813aA620`. Escrow was `0.01 GEN` per engagement. The run ended with `lifecycle: all-passed`, accepted engagement `1`, five accepted-work records, and eight incoming records.

| Engagement | Scenario | Evidence and settlement | Final readback |
| ---: | --- | --- | --- |
| 1 | accepted + performer payout | create `0x54dca620ff6efa23fbb349a5034288fe926c8471ab3775c73b3ddef894e1d7f8`; accept `0x714f9b87cc727492f3019c9040cfb3061e50078922068f2b9202a0dfdd5d2137`; evaluate `0x354ded8039ef81693664ade0cab9c2896d9f8af68a9e271cf56b09cd59ea4a39`; payout + confirmation `0x5c4fbc378544ad0e17332424b49df7da1b3404f940c73441470fd8bed5159d48`, `0xa4249e59c2dd6703852f258e288ea93482b4b7923c43912a126c4ce738541d88` | `COMPLETED`, `ACCEPTED`, `PAYOUT_VERIFIED` |
| 2 | revision + retry | create `0xd9bb38f916144aecf4fe39a4aaf47028ce0f870f69e697e026d5f722e8137bfa`; accept `0x26f6dc01a0109b5d826f9fae251fa652f2564aa48a407436c6e0cb98d83aa8b2`; attempt 1 `0x1680fa79a183353497ad40a9bcf13eabafd10216cf3f8308c7ccf8b9186df9cb`; retry `0x5e67e9f37f9fc3d3d3447898abf2a51cc047f3c80f87f561d39e3edbc3271caa` | `ACTIVE`, `REVISION_REQUIRED`, attempt 2, `HELD` |
| 3 | unavailable evidence | create `0x588d740dcdd49900e08a769c7511ff504d0a75a70d5acd5f07af2f1afb95bfda`; accept `0x3d1c71427c6ee6a9f8f83c8af32d293f95543a22c4bcfdc25b33d0cbdd65507d`; evaluate `0xd383606f56948cce9674b79afa9ee9845c7718d14f67359a90633ce19d38eef8` | `ACTIVE`, `INCONCLUSIVE`, `HELD` |
| 4 | performer decline + refund confirmation | create `0x79bb3e4553516a2f44258820866dc594138939f0197b7db752ccf8c3521e1667`; decline `0xa3117a198628f8931a706f09ba9e642247ac509e05aff8a5edcea46f5f6e02d6`; refund confirmation `0xccb66e2868914f8380974ade4841f96eb1d4d2a8d3c66e9879d25f477e0aee1b` | `DECLINED`, `REFUNDED` |
| 5 | requester cancel + refund confirmation | create `0x608064fc61949fbd27bbb5a5927c38b0c3a11cf548635e1df5ad6ccb239439e7`; cancel `0x4ff49865a03478d273e7f406c116f32abd7446c3e70be1cd755b5facd53920fd`; refund confirmation `0x07a61ed63dab029423bb71ab3bdb6b0db17c68dc7be7c9df1a9c5ed7b2b179d2` | `CANCELLED`, `REFUNDED` |
| 6 | proposal expiry + refund confirmation | create `0x1f6e5c58ec800df359dcea3e56e31873e39808c276e416060d82eef29c17200b`; close expired `0x63790d687a79d887a188a7cf1ddf3203f31fd9d5dbabcb61ff8801f64084dbb6`; refund confirmation `0xdcfc5ba1e8fb09ddbbab9cdb2ccd2a408afae4cfbf17ed8f8a96832c31c65afe` | `EXPIRED`, `REFUNDED` |
| 7 | active delivery expiry + refund confirmation | create `0x899f0b85be10de3dd5d2d9ee2284d40d81f03432a48f3740843775e0a04d2e3d`; accept `0x8e3342f89e35dd0145ec51fbcdb7b98b5f36cb7cf2eeb99d0c57e732ab0db949`; close expired `0x5c99c7e1c4486270a462758deb9308826ae128c9b105fa269011fc3e1581d6b7`; refund confirmation `0xa7388a185921f081e79f5549833cb9244a054d65c8d2fc93c67a6e44610fed77` | `EXPIRED`, `REFUNDED` |
| 8 | mutual closure + two-sided confirmation | request `0xa2288d4eb4e513e3ab6d431245f66a56506b4a19186ead0f61cb0486f17708e6`; requester confirmation `0x8cfd17ab59fdabab40d2b3e96dccef242e6bdeeabbffc131f87554a7910ab962`; performer confirmation `0xeaf59034bbfa187f3ae8b0780642e7d6dc6f47861f4c0b93ea864b12c618621e` | `CLOSED`, `CLOSED_SETTLED` |

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

The final deployable contract source hashes to `B687E24AD9FCEBAC8D9A9E1FEDEE614C2E2E12550BA1C478CBCDDAAB7EB5EA05` and is deployed at `0xc9eCe9f1AF8De797d27836de4Ad8599d813aA620`. The protected-master release commit is `130ab79077069b7fae242006a38c6fbcf860d82d`; its four-job verification is [workflow run 37830414750](https://github.com/Bibidee/accordant/actions/runs/37830414750).

The `Protect master` repository ruleset is active (ID `24645498`) for `refs/heads/master`, blocking deletion and non-fast-forward updates and requiring Web, Direct Mode, production audit, and Required CI gate checks. GitHub shows all current commits authored and committed by Bibidee; no Codex-authored history rewrite was necessary.
