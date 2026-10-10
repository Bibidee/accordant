# ACCORDANT — More Information Requested

## Remediation response

Requested by PAPITO on October 8, 2026.

This document records how ACCORDANT addresses the requested consequential settlement, evidence integrity, dispute lifecycle, transaction correctness, and verification requirements. The implementation is merged on protected `master`, deployed to GenLayer Studionet, and live-verified with two unlocked wallets.

## Final remediation update — closure recovery and challenge-window protection

The two final contract-level findings were implemented in the closure-recovery release and verified on October 9, 2026.

### Closure recovery

- `request_closure()` now records the prior settlement state and opens a bounded one-hour closure window.
- Either participant can call `cancel_closure()` before execution.
- Either participant can call `expire_closure()` after the deadline.
- Cancellation or expiry restores the exact prior settlement state, so an unapproved closure cannot strand payout, refund, challenge, or delivery recovery.
- Approval after the closure deadline fails closed; only the two-sided approval path can execute transfers.
- The frontend displays the closure countdown and exposes the correct cancel or expire action.

### Challenge-window protection

- `challenge_attempt()` no longer replaces `challenge_deadline` after `REJECTED` or `INCONCLUSIVE`.
- Unsuccessful challenges keep the engagement in `CHALLENGE_WINDOW` until the original deadline.
- A performer-initiated rejected or inconclusive challenge cannot unlock payment early or remove the requester’s remaining challenge opportunity.

### Final verification and deployment

- Added adversarial Direct Mode coverage for withheld closure approval, stale closure approval, closure cancellation/expiry, prior-state restoration, and performer self-challenge deadline preservation.
- Direct Mode: 17 tests passed; frontend: 47 tests passed; typecheck, lint, production build, and dependency audit passed.
- Fresh two-wallet lifecycle against the new contract ended `lifecycle: all-passed`.
- New contract: [`0xF34B9BbA585137b05Fc00a3921297614661D836D`](https://explorer-studio.genlayer.com/address/0xF34B9BbA585137b05Fc00a3921297614661D836D).
- Deployment receipt: [`0x788bf4a4befc5b03c688791766e1e6c60e142839dbff8d2d7208588731c69ecb`](https://explorer-studio.genlayer.com/tx/0x788bf4a4befc5b03c688791766e1e6c60e142839dbff8d2d7208588731c69ecb), `FINALIZED`.
- Contract release source: protected-master commit [`b638ef5148d91e378113931872b95e2cd0eb6b45`](https://github.com/Bibidee/accordant/commit/b638ef5148d91e378113931872b95e2cd0eb6b45).
- Production deployment: [`accordant.vercel.app`](https://accordant.vercel.app), READY.
- Final deployment-evidence reconciliation: [PR #27](https://github.com/Bibidee/accordant/pull/27) merged into protected `master`; [CI run `38091927331`](https://github.com/Bibidee/accordant/actions/runs/38091927331) passed all four required jobs.

## Final status

| Item | Final result |
| --- | --- |
| Repository | [Bibidee/accordant](https://github.com/Bibidee/accordant) |
| Production app | [accordant.vercel.app](https://accordant.vercel.app) |
| Network | GenLayer Studionet, chain `61999` |
| Current contract | `0xF34B9BbA585137b05Fc00a3921297614661D836D` |
| Deployment receipt | [`0x788bf4a4…`](https://explorer-studio.genlayer.com/tx/0x788bf4a4befc5b03c688791766e1e6c60e142839dbff8d2d7208588731c69ecb) — `FINALIZED` |
| Contract source SHA-256 (LF) | `C1FB993F29133272839B868B0FB3CABDE5B4E64D706FD67CA567A52EE0E7226E` |
| Contract source SHA-256 (CRLF) | `A722E9A2E6472D026CDE0732B7C716429CFB503957541799FA0494734CCE1D88` |
| Protected master | `b638ef5148d91e378113931872b95e2cd0eb6b45` |
| Contract release CI | [run `37893831750`](https://github.com/Bibidee/accordant/actions/runs/37893831750) — all four jobs passed |
| Vercel deployment | [`DkWLv3wJnGTVqxSK6WTo5YtkEgrh`](https://vercel.com/bibidees-projects/accordant/DkWLv3wJnGTVqxSK6WTo5YtkEgrh) — `READY` |

The tracked Windows source and the finalized RPC source both contain `1,495` CRLF line endings and no bare LF. `gen_getContractCode` returned the current contract source as base64; after decoding, it was an exact `87,680`-byte match to `contracts/accordant.py`. The reproducible command is `node scripts/verify-deployment-source.mjs`; it reports both the raw CRLF hash and the LF-normalized hash above. Vercel production lists `NEXT_PUBLIC_ACCORDANT_CONTRACT` for the Production target, but redacts its sensitive value from CLI pulls; the effective value was verified by the live `/account` page, which displayed the current contract and chain `61999` and contained no superseded address.

## 1. Consequential acceptance and settlement

Acceptance is no longer only a status change.

- Creating an engagement is payable and locks the requester-funded GEN escrow.
- The escrow amount is included in the frozen terms digest.
- A valid `ACCEPTED` result moves the escrow into a bounded challenge-window state.
- The performer cannot withdraw during the challenge window.
- After the window, the performer can withdraw once; a recipient confirmation is required before the contract counts the payout as settled.
- A second withdrawal or confirmation is rejected.
- The requester has no administrator or override method and cannot rewrite accepted terms or invalidate a valid outcome.
- An upheld challenge returns the engagement to `ACTIVE` and restores the funds to `HELD`.
- A rejected or inconclusive challenge preserves the original challenge deadline and keeps the challenge path open until that deadline; it cannot unlock payout early or consume the requester’s remaining challenge opportunity.
- Performer decline, requester cancellation, proposal expiry, and active-delivery expiry all have explicit refund paths.
- Refunds are pending until requester confirmation; pending transfers are not counted as settled.
- Mutual closure requires both participants to approve the same exact allocation digest and both recipients to confirm their transfers. An unexecuted closure has a bounded one-hour window; either participant can cancel it before execution, or either participant can expire it afterward, restoring the exact prior settlement state.

The settlement ledger keeps held, claimable, pending, withdrawn, and refunded amounts separate. This makes the economic consequence independently queryable and prevents premature release or double withdrawal.

## 2. Evidence authenticity and provenance

Evidence source kinds are no longer treated as equivalent arbitrary HTTPS pages.

### `VERSIONED_SOURCE`

The evidence must declare a GitHub repository, an immutable full commit SHA or release tag, and a URL bound to that exact repository and revision. The contract verifies:

1. The GitHub repository exists and its `full_name` and owner match the declared repository.
2. A commit SHA resolves to the same canonical GitHub commit URL.
3. A release tag resolves to the declared release and its target commit.
4. GitHub reports `verification.verified=true` and `reason=valid`.
5. The GitHub proof contains a non-empty cryptographic signature, signed payload, and verification timestamp.
6. Signature and signed-payload digests are stored in the attempt’s `authenticity_json`.

Unsigned, incomplete, forged, mismatched, or merely commit-looking URLs fail closed. The current signed master commit used for verification is [`b638ef5148d91e378113931872b95e2cd0eb6b45`](https://github.com/Bibidee/accordant/commit/b638ef5148d91e378113931872b95e2cd0eb6b45); GitHub reports it as verified with reason `valid`.

### `TRANSACTION`

Transaction evidence must declare:

- a 32-byte transaction hash;
- `genlayer-studionet`;
- chain ID `61999`;
- the target contract address; and
- the matching Studionet explorer URL.

The contract independently fetches the explorer transaction-detail record and requires the hash, target contract, and `FINALIZED` receipt to match. A caller cannot turn an unrelated receipt or another network into evidence by changing metadata.

### Mutable evidence and fingerprints

- `PUBLIC_ARTIFACT` and `LIVE_DEPLOYMENT` references can support current-state criteria.
- They are rejected for criteria whose frozen policy requires durable evidence.
- Content fingerprints reproduce what was observed and bind it to the attempt, but a hash alone is not treated as proof of authenticity.
- Every attempt stores source metadata, verification method, provider proof digest, signed-payload digests where applicable, fetched-content digest, evidence fingerprint, and consensus-bound evidence data.

## 3. Adversarial resolution and dispute lifecycle

ACCORDANT preserves append-only milestone acceptance while preventing repeated near-equivalent submissions from pressuring validators.

- Evidence is canonicalized by criterion, kind, and normalized URL.
- Ordering and non-semantic notes cannot bypass replay protection.
- Duplicate references, duplicate semantic submissions, and unchanged retries fail closed.
- Attempt history is append-only, page-addressable, and bounded at 50 attempts.
- Consensus compares criterion statuses and stable evidence-binding data, not validator explanations.
- Invalid, incomplete, unavailable, or contradictory validator results produce a defined non-acceptance outcome.
- A completed accepted attempt has a bounded challenge window.
- Only an engagement participant can challenge, the challenge count is bounded, and challenge evidence is independently fingerprinted.
- Challenge resolution is neutral consensus over `UPHELD`, `REJECTED`, or `INCONCLUSIVE`.
- No participant can unilaterally rewrite frozen terms, bypass accrued rights, or close an allocation without the other participant’s approval.
- The agreement page shows the closure countdown, prior settlement state, and the appropriate cancel or expire recovery action; it hides resolved closure records from the active approval surface.

## 4. Transaction correctness

`lib/genlayer.ts` separates protocol state from product state.

- Protocol `ACCEPTED` with no explicit execution-success metadata remains provisional.
- `FINALIZED` with a known unsuccessful execution result is classified as failed.
- A finalized receipt is not treated as an application success until canonical contract readback confirms the expected state transition.
- Receipt refresh, monitoring, recovery, and route reconciliation all use the same fail-closed rules.
- Protocol `UNDETERMINED` is never converted into a product outcome.

## 5. Verification performed

### Direct Mode contract tests

17 tests passed against the production contract source and pinned GenLayer testing bundle. Coverage includes:

- payable escrow and pending payout/refund confirmation;
- challenge-window enforcement and challenge outcomes;
- premature release and double-withdrawal protection;
- performer decline, requester cancellation, proposal expiry, and delivery expiry recovery;
- mutual closure and two-sided transfer confirmation;
- closure cancellation/expiry, stale approval rejection, and restoration of the prior settlement state;
- requester protection against rejected and performer-initiated inconclusive challenges shortening the original challenge window;
- role authorization and role-specific indexes;
- malformed evidence, mutable/durable policy enforcement, unavailable evidence, and malicious validator outputs;
- semantic replay, repeated submissions, pagination, and attempt limits;
- GitHub repository ownership, immutable commit/release proof, signed-proof acceptance, unsigned-proof rejection, and Studionet transaction provenance.

### Frontend tests and build

47 frontend tests passed, including:

- strict transaction execution classification;
- provisional `ACCEPTED` handling;
- finalized receipt refresh and monitoring;
- transaction recovery and fail-closed reconciliation;
- concurrent appended-attempt matching;
- historical/latest attempt semantics;
- duplicate/no-match and unchanged-count fail-closed cases;
- count/fetch pagination races; and
- active-only evidence-desk gating.

Also passed:

- TypeScript typecheck;
- ESLint;
- production webpack build;
- Studionet-only network check;
- full dependency audit with zero vulnerabilities; and
- `git diff --check`.

## 6. Fresh two-wallet lifecycle evidence

The unlocked CLI wallets `fresh-alice` (requester) and `fresh-bob` (performer) ran the complete lifecycle against the current contract. The run ended with `lifecycle: all-passed`, accepted engagement `1`, five accepted-work records, and eight incoming records.

| Scenario | Final canonical result |
| --- | --- |
| Accepted evidence + performer payout | `COMPLETED`, `ACCEPTED`, `PAYOUT_VERIFIED` |
| Revision-required submission + retry | `ACTIVE`, `REVISION_REQUIRED`, `HELD` |
| Unavailable evidence | `ACTIVE`, `INCONCLUSIVE`, `HELD` |
| Performer decline + refund confirmation | `DECLINED`, `REFUNDED` |
| Requester cancellation + refund confirmation | `CANCELLED`, `REFUNDED` |
| Proposal expiry + refund confirmation | `EXPIRED`, `REFUNDED` |
| Active delivery expiry + refund confirmation | `EXPIRED`, `REFUNDED` |
| Mutual closure + two-sided confirmation | `CLOSED`, `CLOSED_SETTLED` |

Every lifecycle transaction finalized successfully. Pending payout, refund, and closure transfers were not counted as settled until the intended recipient confirmed them. The complete explorer-linked transaction table is recorded in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## 7. Production browser verification

The final production deployment was checked at exact `390×844` dimensions:

- `/`
- `/work`
- `/work/new`
- `/activity`
- `/account`

All routes rendered without horizontal overflow. The responsive mobile Menu opened and exposed the expected navigation links. The account route displayed Studionet `61999` and the current contract address.

## Qualification about cryptographic verification

ACCORDANT does not treat GitHub API existence or a content hash as authenticity. It requires GitHub’s cryptographic verification fields and binds the returned signature and payload to the evidence audit record.

The remaining trust boundary is that GitHub is the verification oracle; the GenLayer contract does not run a local GPG public-key verifier. This is an explicit architectural limitation, not an unsigned-evidence gap. If independent local key verification is required beyond GitHub’s signed verification result, that would require a separate off-chain verifier or signed-attestation service.

## GenLayer review request and resolution

Requested by Gen. Dave on October 10, 2026.

The review identified that the repository documentation did not consistently identify the current deployment: `.env.example` and `docs/DEPLOYMENT.md` named `0xF34B9B…`, while `README.md` and `HANDOFF_STATUS.md` still described superseded deployments as current or final. The review also identified a source-hash discrepancy and required independent on-chain source verification, production configuration verification, one canonical deployment record, correction of stale deployment statements, and a green protected-master CI run.

The requested reconciliation is complete in protected `master` and is recorded below.

### Fixes delivered

- Standardized the current contract address and network across the repository documentation and example configuration.
- Moved superseded contract addresses into clearly labelled historical sections instead of presenting them as current or final.
- Documented both the LF-normalized and Windows CRLF source hashes, including the line-ending normalization method.
- Added a reproducible `gen_getContractCode` verification command and recorded the decoded on-chain byte comparison.
- Verified the effective Vercel Production contract binding through the live `/account` page because Vercel redacts the sensitive CLI value.
- Preserved the deployment transaction, release commit, source hashes, RPC comparison, and production binding in the canonical deployment record.
- Ran the required protected-master CI jobs successfully.
- Made no contract-logic, frontend, economic-rule, dependency, or deployment changes; no contract redeployment was required.

## GenLayer review consistency reconciliation

The deployment and documentation inconsistency identified in the October 10, 2026 review has been resolved in protected `master`.

- The canonical current contract is [`0xF34B9BbA585137b05Fc00a3921297614661D836D`](https://explorer-studio.genlayer.com/address/0xF34B9BbA585137b05Fc00a3921297614661D836D) on GenLayer Studionet, chain `61999`.
- The deployment transaction is [`0x788bf4a4befc5b03c688791766e1e6c60e142839dbff8d2d7208588731c69ecb`](https://explorer-studio.genlayer.com/tx/0x788bf4a4befc5b03c688791766e1e6c60e142839dbff8d2d7208588731c69ecb).
- `README.md`, `HANDOFF_STATUS.md`, `.env.example`, `docs/DEPLOYMENT.md`, and this file now identify the same current address.
- Superseded addresses `0xd9a36f60D41bb343590274b9E905A314Ac6D55A6` and `0xc9eCe9f1AF8De797d27836de4Ad8599d813aA620` are retained only under historical deployment sections.
- The tracked GitHub source with LF line endings hashes to `C1FB993F29133272839B868B0FB3CABDE5B4E64D706FD67CA567A52EE0E7226E`.
- The Windows CRLF representation hashes to `A722E9A2E6472D026CDE0732B7C716429CFB503957541799FA0494734CCE1D88`.
- `node scripts/verify-deployment-source.mjs` calls `gen_getContractCode`; the decoded on-chain source was `87,680` bytes and matched the tracked source byte-for-byte. Both raw CRLF and LF-normalized comparisons passed.
- Vercel production lists `NEXT_PUBLIC_ACCORDANT_CONTRACT` for the Production target. Because Vercel redacts the sensitive value from CLI output, the effective binding was verified through the live [`/account`](https://accordant.vercel.app/account) page: HTTP 200, current contract displayed, chain `61999` displayed, and neither superseded address present.
- No contract redeployment, frontend rebuild, or Vercel configuration change was required for this reconciliation.
- Final protected-master commit: [`00c73d3de7378d1d317966781b7ff735889c4d1c`](https://github.com/Bibidee/accordant/commit/00c73d3de7378d1d317966781b7ff735889c4d1c); final CI: [run `38092206560`](https://github.com/Bibidee/accordant/actions/runs/38092206560), with all four required jobs passing.

## Conclusion

The requested economic consequence, evidence-integrity controls, adversarial resolution, transaction correctness, deployment evidence, documentation consistency, production frontend, and explorer-linked two-wallet lifecycle evidence are implemented and verified in the current protected-master release.
