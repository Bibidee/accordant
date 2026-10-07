# Accordant hardening audit

Audit baseline: `4e863c534254d402b0f593e66fcf8646518521ed` (2026-10-06). Remediation pass: `48281c7df1af71086017c7425c0315cf195f2510` and subsequent documentation/lifecycle evidence updates.

The baseline findings below are retained as historical context. The current status is recorded in the resolved findings that follow; they are not open release blockers unless explicitly marked remaining.

## Contract findings

- Evidence URL parsing, private/numeric host rejection, credentials/fragments, IPv6 brackets, and port bounds are enforced in contract and frontend validation.
- Requester-created, performer-incoming, and performer-accepted indexes are separate and page-addressable. Unsolicited proposals never enter accepted performer work.
- Attempt history is capped at 50 attempts and exposed through bounded pages.
- Writes verify Studionet chain `61999`; reads and writes use the configured deployed contract.
- Malformed or incomplete validator vectors fail closed, and required criterion status determines product-result precedence.

## Frontend findings

- The shell exposes role-specific work sections, public reads, and responsive route layouts.
- Work pages load one bounded page per role and require explicit `Load more`; they do not enumerate a wallet’s complete history.
- Transaction UI has separate success and failure rails and a distinct canonical-state-verified step.
- Manual receipt refresh and polling share the same finalized/canonical readback path.
- Frontend evidence URL validation remains aligned with the contract boundary.

## Verification findings

- `tests/direct/test_accordant.py` exercises the production contract source in Direct Mode, including 121-record pagination, role integrity, malformed criterion inputs, and lifecycle outcomes.
- GitHub Actions remains split into Web, Direct Mode, Production dependency audit, and Required CI gate jobs.
- The changed contract was freshly deployed at `0x5C0D3125B030cA113B3c8866AE6f6B4B742F1e0E` from source commit `48281c7df1af71086017c7425c0315cf195f2510` and source SHA `D730EBB1574BEEEC501C3FA4C29016C00DFFB831A8D345D50642744903381EA4`.

The changed-contract deployment requirement is satisfied. The previous address `0x838D981244760a4A70c315311908347DEc953e8B` is superseded and is not a current production binding.
