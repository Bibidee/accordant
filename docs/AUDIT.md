# Accordant hardening audit

Audit baseline: `4e863c534254d402b0f593e66fcf8646518521ed` (2026-10-06). Remediation pass: `48281c7df1af71086017c7425c0315cf195f2510`, frontend hardening commit `be306a8936fbb4e5c33061883362e04ed6f3d1f0`, and concurrent-reconciliation fix `738f1ef11ebb7b56793cfbd6fd8d02663392648a`.

The baseline findings below are retained as historical context. The current status is recorded in the resolved findings that follow; they are not open release blockers unless explicitly marked remaining.

## Contract findings

- Evidence URL parsing, private/numeric host rejection, credentials/fragments, IPv6 brackets, and port bounds are enforced in contract and frontend validation.
- Requester-created, performer-incoming, and performer-accepted indexes are separate and page-addressable. Unsolicited proposals never enter accepted performer work.
- Attempt history is capped at 50 attempts and exposed through bounded pages.
- Writes verify Studionet chain `61999`; reads and writes use the configured deployed contract.
- Malformed or incomplete validator vectors fail closed, and required criterion status determines product-result precedence.
- Engagement creation is payable and records exact GEN escrow, frozen evidence policy, and challenge-window terms in the terms digest.
- Held, claimable, pending-transfer, withdrawn, and refunded balances are tracked separately; payout/refund/closure transfers require recipient confirmation before accounting becomes final.
- Participants can challenge an accepted attempt during the bounded challenge window; upheld challenges return the engagement to `ACTIVE` and restore funds to `HELD`.
- Mutual closure requires both participant approvals over an exact allocation digest and separate recipient confirmation for each emitted transfer.
- The frozen evidence policy distinguishes `current` from `durable` criteria. Mutable `PUBLIC_ARTIFACT` and `LIVE_DEPLOYMENT` references fail closed when a criterion requires durable proof.
- `VERSIONED_SOURCE` references require a GitHub repository, a full commit SHA or release tag, and a matching GitHub URL. The contract verifies repository ownership and commit/release existence through GitHub's repository, commit, or release APIs, then requires GitHub's cryptographic verification fields (`verified=true`, `reason=valid`, signature, signed payload, and verification timestamp) for the commit or release target. Signature and signed-payload digests are stored for audit; unsigned or incomplete signature proof fails closed.
- `TRANSACTION` references require a 32-byte hash, `genlayer-studionet`, chain `61999`, a target contract, and the matching Studionet explorer URL. The contract verifies the explorer transaction-detail API's finalized receipt, hash, and target contract before the evidence can contribute to acceptance.
- Each attempt stores source metadata, provider verification method/result, provider proof digest, GitHub signature/signed-payload digests where applicable, and fetched-content digest in `authenticity_json`; a content digest is an audit fingerprint, not a substitute for source-specific signature or receipt verification.

## Frontend findings

- The shell exposes role-specific work sections, public reads, and responsive route layouts.
- Work pages load one bounded latest-first page per role and require explicit `Load older`; they do not enumerate a wallet’s complete history or bury recent work behind the oldest records.
- The final partial older page requests only its exact remaining count, and wallet/version guards reject stale asynchronous page results.
- Transaction UI has separate success and failure rails and a distinct canonical-state-verified step.
- Manual receipt refresh and polling share the same finalized/canonical readback path.
- Creation readback checks the pre-write requester count, full frozen terms, criteria order/required flags, status, and terms digest. Evidence readback scans only attempts appended after the pre-write baseline, matches exact canonical evidence JSON and submission digest, fails closed unless there is one match, and distinguishes latest-attempt state from historical revision/inconclusive state.
- Canonical reconciliation preserves valid `REVISION_REQUIRED` and `INCONCLUSIVE` receipts after a later legitimate `EXPIRED` lifecycle transition. Latest non-accepted attempts require matching `latest_result`; historical non-accepted attempts remain valid across `ACTIVE`, `COMPLETED`, and `EXPIRED` states.
- Latest-first page reads compare the count probe with the returned page total and recalculate the latest window at most once, preserving a bounded one-count/two-page read budget even when more records arrive during the retry.
- Frontend evidence URL validation remains aligned with the contract boundary.
- The new-engagement composer accepts exact decimal GEN amounts, passes payable value to `genlayer-js`, and freezes the evidence policy and challenge window before signing.
- Agreement pages expose escrow ledger state, challenge controls, payout/refund confirmations, and mutual-closure approval/transfer confirmation without treating a protocol receipt as economic settlement.

## Verification findings

- `tests/direct/test_accordant.py` exercises the production contract source in Direct Mode, including 121-record pagination, role integrity, malformed criterion inputs, and lifecycle outcomes.
- GitHub Actions remains split into Web, Direct Mode, Production dependency audit, and Required CI gate jobs.
- The frontend regression suite has 47 passing UI tests, including strict transaction execution classification, fail-closed receipt refresh/monitor behavior, concurrent appended-attempt reconciliation, historical/latest attempt semantics, duplicate/no-match fail-closed cases, count/fetch pagination races, finalized-unverified handling, and the active-only evidence-desk gate.
- Direct Mode has 16 passing contract tests covering escrow funding, pending transfer confirmations, challenge outcomes, policy enforcement, GitHub ownership/cryptographically verified commit and release proof, unsigned-proof fail-closed behavior, Studionet receipt provenance, mutual closure, role authorization, malformed evidence, retries, pagination, and expiry.
- Full development and production npm audits now report `found 0 vulnerabilities`; the deploy CLI is isolated from the frontend dependency tree and the lint stack no longer uses the vulnerable Next ESLint bundle.
- GitHub Actions uses Node 24-compatible action majors, and the active `Protect master` ruleset (ID `24645498`) requires all four CI checks while blocking deletion and non-fast-forward updates.
- The protected master ruleset requires all four CI checks; current master verification should always refer to the latest successful protected-master workflow rather than a fixed historical run number. The production deployment is recorded in `docs/DEPLOYMENT.md`.
- The final provenance-hardened contract was freshly deployed at `0x11dE514195AD2d3e534ab130B41B91682CD6dC0D` with deployment transaction `0xe8161c8149c50f04db347f7f5ede0e5236858f413f483d2276087b8a7312063e` and source SHA `C98D0AC84862851542A6967F72D4961A84B024C6522977A615A53A73EC1C4E44`.

The changed-contract deployment requirement is satisfied. Previous deployment addresses are superseded and are not current production bindings.
