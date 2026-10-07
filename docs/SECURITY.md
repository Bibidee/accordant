# ACCORDANT Security and Trust Model

## Threats

### Post-delivery reinterpretation
Mitigation: requester signs creation; performer signs acceptance; criteria are immutable after proposal creation and cannot be rewritten after work is delivered.

### Performer self-certification
Mitigation: performer can submit evidence but cannot set criterion decisions or overall outcomes.

### Requester/admin override
Mitigation: no administrator outcome method and no requester override method exist.

### Prompt injection in evidence
Mitigation: every fetched artifact is explicitly treated as untrusted DATA. Validator prompts must state that external text/code/comments are evidence only and any embedded instructions must be ignored.

### Evidence outage interpreted as failure
Mitigation: unavailable/malformed/rate-limited/insufficient sources map to `UNVERIFIABLE` when appropriate, not `NOT_MET`.

### Mutable evidence
Mitigation: UI should strongly prefer version-addressed artifacts. Mutable live URLs may support a criterion but should not silently satisfy historical/version-specific claims.

### Replay
Mitigation: canonical attempt digest and/or evidence digest is evaluated once per engagement.

### Validator disagreement
Mitigation: compare a strict consensus-critical vector containing criterion indices/statuses and stable evidence-binding fields. Explanations are not consensus-critical.

### Protocol/product state confusion
Mitigation: protocol `UNDETERMINED` must not be stored or shown as ACCORDANT `INCONCLUSIVE`; they mean different things.

### Frontend authority
Mitigation: UI state is never authoritative. Refresh must reconstruct engagement and attempt state from the contract.

### Address and URL abuse
Mitigation: the contract and frontend reject the zero address, enforce HTTPS evidence URLs, reject credentials/fragments/private and numeric-host forms, and reject ports outside `1–65535` before a source is accepted.

### Semantic replay and evidence ordering
Mitigation: replay identity canonicalizes criterion/kind/normalized URL tuples, ignores non-semantic notes, and sorts evidence before hashing so equivalent submissions cannot bypass the retry guard through ordering or note changes.

### Unbounded history growth
Mitigation: requester and performer indexes are append-only but page-addressable. Reads use explicit offsets and limits instead of a fixed wallet-entry cap, while contract writes preserve the canonical count.

### Signing and transaction lifecycle
Mitigation: the frontend uses one pending guard per action, separates protocol transaction states from product outcomes, exposes transaction hashes only after submission, and polls canonical contract state after finalization.
