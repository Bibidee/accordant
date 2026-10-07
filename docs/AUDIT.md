# Accordant hardening audit

Audit baseline: `4e863c534254d402b0f593e66fcf8646518521ed` (2026-10-06). Remediation pass: `48281c7df1af71086017c7425c0315cf195f2510`, frontend hardening commit `be306a8936fbb4e5c33061883362e04ed6f3d1f0`, and concurrent-reconciliation fix `738f1ef11ebb7b56793cfbd6fd8d02663392648a`.

The baseline findings below are retained as historical context. The current status is recorded in the resolved findings that follow; they are not open release blockers unless explicitly marked remaining.

## Contract findings

- Evidence URL parsing, private/numeric host rejection, credentials/fragments, IPv6 brackets, and port bounds are enforced in contract and frontend validation.
- Requester-created, performer-incoming, and performer-accepted indexes are separate and page-addressable. Unsolicited proposals never enter accepted performer work.
- Attempt history is capped at 50 attempts and exposed through bounded pages.
- Writes verify Studionet chain `61999`; reads and writes use the configured deployed contract.
- Malformed or incomplete validator vectors fail closed, and required criterion status determines product-result precedence.

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

## Verification findings

- `tests/direct/test_accordant.py` exercises the production contract source in Direct Mode, including 121-record pagination, role integrity, malformed criterion inputs, and lifecycle outcomes.
- GitHub Actions remains split into Web, Direct Mode, Production dependency audit, and Required CI gate jobs.
- The frontend regression suite has 25 passing UI tests, including concurrent appended-attempt reconciliation, historical/latest attempt semantics, duplicate/no-match fail-closed cases, and count/fetch pagination races.
- Full development and production npm audits now report `found 0 vulnerabilities`; the deploy CLI is isolated from the frontend dependency tree and the lint stack no longer uses the vulnerable Next ESLint bundle.
- GitHub Actions uses Node 24-compatible action majors, and the active `Protect master` ruleset (ID `24645498`) requires all four CI checks while blocking deletion and non-fast-forward updates.
- Final merged master CI run `37615219327` passed all four required jobs on HEAD `aa6463e60a190e9107c528c3f8fb534c43d838c0`; the frontend-only production deployment is `9DypEwf3N9ZhKoBje2MaGG4WYjBQ`.
- The changed contract was freshly deployed at `0x5C0D3125B030cA113B3c8866AE6f6B4B742F1e0E` from source commit `48281c7df1af71086017c7425c0315cf195f2510` and source SHA `D730EBB1574BEEEC501C3FA4C29016C00DFFB831A8D345D50642744903381EA4`.

The changed-contract deployment requirement is satisfied. The previous address `0x838D981244760a4A70c315311908347DEc953e8B` is superseded and is not a current production binding.
