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
