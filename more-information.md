# ACCORDANT — More Information Requested

## Remediation response

Requested by PAPITO on October 8, 2026.

This document records how ACCORDANT addresses the requested consequential settlement, evidence integrity, dispute lifecycle, transaction correctness, and verification requirements. The implementation is merged on protected `master`, deployed to GenLayer Studionet, and live-verified with two unlocked wallets.

## Final status

| Item | Final result |
| --- | --- |
| Repository | [Bibidee/accordant](https://github.com/Bibidee/accordant) |
| Production app | [accordant.vercel.app](https://accordant.vercel.app) |
| Network | GenLayer Studionet, chain `61999` |
| Current contract | `0xd9a36f60D41bb343590274b9E905A314Ac6D55A6` |
| Deployment receipt | [`0xc510662e…`](https://explorer-studio.genlayer.com/tx/0xc510662ea42ae15200d67a749b341c996f3f1d5974d9b977a793a16dc5f6a50a) — `FINALIZED` |
| Contract source SHA-256 | `CC0EC42ADA86145EA0308BD173FFBD3FCDB854BD0FB2C60C1886562CD00FCABA` |
| Protected master | `57f471d524a3dae2241dc01890a3f24910ea852e` |
| Final protected CI | [run `37864531578`](https://github.com/Bibidee/accordant/actions/runs/37864531578) — all four jobs passed |
| Vercel deployment | [`2jxcrQMDbsQB14TE3Bt92f9efTth`](https://vercel.com/bibidees-projects/accordant/2jxcrQMDbsQB14TE3Bt92f9efTth) — `READY` |

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
- A rejected or inconclusive challenge allows the claimable payout path after the challenge deadline.
- Performer decline, requester cancellation, proposal expiry, and active-delivery expiry all have explicit refund paths.
- Refunds are pending until requester confirmation; pending transfers are not counted as settled.
- Mutual closure requires both participants to approve the same exact allocation digest and both recipients to confirm their transfers.

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

Unsigned, incomplete, forged, mismatched, or merely commit-looking URLs fail closed. The current signed master commit used for verification is [`57f471d524a3dae2241dc01890a3f24910ea852e`](https://github.com/Bibidee/accordant/commit/57f471d524a3dae2241dc01890a3f24910ea852e); GitHub reports it as verified with reason `valid`.

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

## 4. Transaction correctness

`lib/genlayer.ts` separates protocol state from product state.

- Protocol `ACCEPTED` with no explicit execution-success metadata remains provisional.
- `FINALIZED` with a known unsuccessful execution result is classified as failed.
- A finalized receipt is not treated as an application success until canonical contract readback confirms the expected state transition.
- Receipt refresh, monitoring, recovery, and route reconciliation all use the same fail-closed rules.
- Protocol `UNDETERMINED` is never converted into a product outcome.

## 5. Verification performed

### Direct Mode contract tests

16 tests passed against the production contract source and pinned GenLayer testing bundle. Coverage includes:

- payable escrow and pending payout/refund confirmation;
- challenge-window enforcement and challenge outcomes;
- premature release and double-withdrawal protection;
- performer decline, requester cancellation, proposal expiry, and delivery expiry recovery;
- mutual closure and two-sided transfer confirmation;
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

## Conclusion

The requested economic consequence, evidence-integrity controls, adversarial resolution, transaction correctness, tests, deployment, documentation, production frontend, and explorer-linked two-wallet lifecycle evidence are implemented and verified in the current protected-master release.
