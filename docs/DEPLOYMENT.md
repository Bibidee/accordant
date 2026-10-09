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

- Current contract address: `0xF34B9BbA585137b05Fc00a3921297614661D836D`.
- Deployment transaction: `0x788bf4a4befc5b03c688791766e1e6c60e142839dbff8d2d7208588731c69ecb`.
- Deployment explorer: https://explorer-studio.genlayer.com/tx/0x788bf4a4befc5b03c688791766e1e6c60e142839dbff8d2d7208588731c69ecb
- Deployment status: `FINALIZED`; result: `MAJORITY_AGREE`.
- Deployment source SHA-256: `A722E9A2E6472D026CDE0732B7C716429CFB503957541799FA0494734CCE1D88`.
- The final revision adds payable GEN escrow, frozen evidence policy, bounded challenges, preserved challenge deadlines, explicit pending transfers, recipient confirmations, bounded mutual closure recovery, and GitHub-signature-verified immutable evidence provenance.
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
- Production deployment: https://vercel.com/bibidees-projects/accordant/DkWLv3wJnGTVqxSK6WTo5YtkEgrh (`READY`).
- Generated deployment URL: https://accordant-qdryrvt0u-bibidees-projects.vercel.app
- Production runtime source tree: protected-master merge commit `b638ef5148d91e378113931872b95e2cd0eb6b45` (fresh production deployment `DkWLv3wJnGTVqxSK6WTo5YtkEgrh`).
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
- Direct Mode — 17 contract tests passed against the pinned GenLayer test bundle, including escrow funding, pending payout/refund confirmation, preserved challenge deadlines, closure cancellation/expiry and state restoration, challenges, policy enforcement, cryptographically verified GitHub commit/release provenance, unsigned-proof fail-closed behavior, Studionet receipt provenance, mutual closure, 121-record role/pagination, and malformed criterion cases. The GenLayer testing suite is pinned in `requirements-dev.txt`.
- Deployed schema query at `0xF34B9BbA585137b05Fc00a3921297614661D836D`, including `get_performer_incoming`, separate accepted-work pagination, escrow accounting, challenge history, bounded closure recovery, closure confirmation views, and stored authenticity proof metadata.
- Deployment receipt query — `FINALIZED` / `MAJORITY_AGREE`.
- GitHub signature smoke verification — [master commit `b638ef5148d91e378113931872b95e2cd0eb6b45`](https://github.com/Bibidee/accordant/commit/b638ef5148d91e378113931872b95e2cd0eb6b45) returned `verification.verified=true`, `reason=valid`, a non-empty PGP signature, signed payload, and `verified_at` timestamp through GitHub's commit API; unsigned or incomplete proof is rejected by the contract and Direct Mode.
- The protected master ruleset requires Web tests and production build, Direct Mode contract tests, Production dependency audit, and the Required CI gate. Protected-master workflow [37893831750](https://github.com/Bibidee/accordant/actions/runs/37893831750) passed all four jobs for merge commit `b638ef5148d91e378113931872b95e2cd0eb6b45`.

The current production browser check opened `/`, `/work`, `/work/new`, `/activity`, and `/account`; each route rendered Accordant content, the account route showed Studionet `61999` and `0xF34B9BbA585137b05Fc00a3921297614661D836D`, and no route had horizontal overflow. Exact interactive mobile QA was completed at `390×844`: all five routes rendered without horizontal overflow, and the responsive `Menu` opened and exposed the mobile navigation links.

## Final live two-wallet lifecycle (current contract)

On 2026-10-09, the unlocked CLI wallets `fresh-alice` (requester, `0x7C65cE913F5665c11f1219048112C84CD6cb2a4B`) and `fresh-bob` (performer, `0x2cd419603eBa593074653930Ddc4073d4FD8fc60`) ran the complete lifecycle suite against `0xF34B9BbA585137b05Fc00a3921297614661D836D`. Escrow was `0.01 GEN` per engagement. The run ended with `lifecycle: all-passed`, accepted engagement `1`, five accepted-work records, and eight incoming records.

| Engagement | Scenario | Evidence and settlement | Final readback |
| ---: | --- | --- | --- |
| 1 | accepted + performer payout | create `0xaa9af6eb52dd617cabcd8287c2655c17cccd384a3855a12ee293e2d6a1c36c61`; accept `0xd8e7cf3fad151154f1cefb568e900bd2e679f3b0f08c86a9af1706cb1775ab87`; evaluate `0xc2be0714373824401108931c5d59e4534519f477ee188fc72edce387d572b0cf`; payout + confirmation `0xee3e4149a0ce60ddb320c050dac2044bb090d140ff08fa0d27aa0f4d4bb4f4da`, `0xd0f6b44c681779e6006313885f3f9b51f64623497d8530cd0aade18792614dd0` | `COMPLETED`, `ACCEPTED`, `PAYOUT_VERIFIED` |
| 2 | revision + retry | create `0x3f6ed9ee790c9bc2467f4c358ac84b3bfe481b1f969d8c08fb9c9a207c288912`; accept `0x59468a4d7f1c5241b660330942618229f5abd9c2d80c76af954647d459580840`; attempt 1 `0x4bf7734766e62f7239ff12b5e28da56f7d8cf62fbd59be5873432e40da9b2520`; retry `0x800934d53967c4b14dede37a3724450c1896c40a2540bfa441f0b2787983aab8` | `ACTIVE`, `REVISION_REQUIRED`, attempt 2, `HELD` |
| 3 | unavailable evidence | create `0x65c12f2d23db37fcaf86b071e15e6b30ab34480b80bedb3b81b7bc17914ce698`; accept `0x69a384def92280844e84e6dbc908fcc25c9ca9d70a6e1eff33adc216747f6517`; evaluate `0x7e35384952672f715835826c4441d4754234d7f8f3f38b5436fa6f9bb096337a` | `ACTIVE`, `INCONCLUSIVE`, `HELD` |
| 4 | performer decline + refund confirmation | create `0x0e99e125468be69b401a70b167562700c649544a7182a5d1681e063f58f1b4b7`; decline `0xccc7a8ed407b2f29936b71f9deb07436c407808576a5a051a97f18789cf6e291`; refund confirmation `0x30432f0ab87bc77d224d7d6e8db91159c7a6abe3c0ad50a32eb270415116f30d` | `DECLINED`, `REFUNDED` |
| 5 | requester cancel + refund confirmation | create `0x60f3ee8df52ee4fba481ea3eec53ac801490416351062a5c5e8e0d73d634114c`; cancel `0xc4e5672edacec402ee4d9c20e90d8737134598082fd9e00e7a54350ac36da520`; refund confirmation `0x3395514b990be15214ae99333d6389ba862af4540da5153411a497b4f254a685` | `CANCELLED`, `REFUNDED` |
| 6 | proposal expiry + refund confirmation | create `0x2b4d4641fb829d5ccc1c643ffe963f9f01d3d99e3107300abd7e0ead54beb267`; close expired `0xde4f6cb8d475ad601981ca9631c7e259fc5ed9d79596be2d0679b47d4bfc966c`; refund confirmation `0x11dc623012b3e9a44233554075251702f36576fba02e833540138ec3b570673a` | `EXPIRED`, `REFUNDED` |
| 7 | active delivery expiry + refund confirmation | create `0x33d2473412f330322e691123c314bbe86b70f5908d600ca4aecd5a2134d81118`; accept `0x8ac268e88268ae2b05272df8d7ad1f5758a7f6da913ca6587d81466eac9cba4a`; close expired `0x676cd73776391691d273e2b09c03b9681b9f221714f7aaf4611d60832d5cdbed`; refund confirmation `0xc4c8369bc44bea31b506ed032fbb860b4c7fc33ad1878155e42a9bc6119374cc` | `EXPIRED`, `REFUNDED` |
| 8 | mutual closure + two-sided confirmation | request `0x206bd2e82363415db1fa7d5a2cb7ff2b582846aebec3de0718aed3f7dfb3cd7b`; requester confirmation `0x2b98f8d2e61bcfa4f0e033a48518b76b2cb8729d9d0cec95c280cbd8af2f7446`; performer confirmation `0x8036dfeb40c95e80c92b4391368834ed680a6a1959c6f72f3bba8b60accb7c7e` | `CLOSED`, `CLOSED_SETTLED` |

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

The final deployable contract source hashes to `A722E9A2E6472D026CDE0732B7C716429CFB503957541799FA0494734CCE1D88` and is deployed at `0xF34B9BbA585137b05Fc00a3921297614661D836D`. The protected-master release commit is `b638ef5148d91e378113931872b95e2cd0eb6b45`; its four-job verification is [workflow run 37893831750](https://github.com/Bibidee/accordant/actions/runs/37893831750).

The `Protect master` repository ruleset is active (ID `24645498`) for `refs/heads/master`, blocking deletion and non-fast-forward updates and requiring Web, Direct Mode, production audit, and Required CI gate checks. GitHub shows all current commits authored and committed by Bibidee; no Codex-authored history rewrite was necessary.
