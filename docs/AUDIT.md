# Accordant hardening audit

Audit baseline: `4e863c534254d402b0f593e66fcf8646518521ed` (2026-10-06).

This is the pre-change audit record for the technical and visual reconstruction pass. It records findings against the current repository before contract semantics are changed.

## Contract findings

- Evidence URL validation inspects raw authority text with string prefixes. It does not reliably separate credentials, brackets, ports, IPv6 literals, or normalized hostnames.
- Wallet engagement IDs are appended to one unbounded index for both requester and performer. A requester can create unsolicited performer entries without a bound.
- Attempt history is returned as one unbounded array and has no V1 cap or pagination.
- The shared frontend write helper does not verify chain `61999`; individual pages perform inconsistent checks.
- Product-result derivation returns `ACCEPTED` when a required criterion is missing from the decision vector.

## Frontend findings

- The current shell is a generic card/list treatment with hidden mobile navigation and no agreement-board mechanism.
- Wallet disconnect only emits an event; the injected provider remains readable, so the app can immediately appear connected again.
- The attempt-review route calls state mutation during render when stored JSON is malformed.
- Transaction UI starts at submitted state and does not provide a reusable, explicit signature → consensus → finality → canonical-readback model.
- Work and attempt-history pages load all IDs/history in one request and use unbounded `Promise.all` reads.
- Frontend evidence URL validation is not a parser-based parity implementation of the contract rule.

## Verification findings

- `tests/direct/test_accordant.py` contains only one local invariant and does not exercise the Accordant contract.
- There is no GitHub Actions workflow.
- The deployed source provenance must be recomputed after any contract change; the existing Studionet address cannot be reused for a changed contract.

The next changes deliberately treat contract modifications as a new deployment requirement. Existing production evidence remains attached to the old address until a new source hash, deployment receipt, and live lifecycle suite are recorded.
