# ACCORDANT V1 Product Specification

## Product sentence

A neutral milestone-acceptance workspace where two parties freeze what “done” means before work begins and GenLayer independently determines whether submitted public evidence satisfies those requirements.

## Primary user

A requester/sponsor and a designated performer/builder working against one public, evidence-verifiable deliverable.

## Core problem

Milestone acceptance often depends on semantic requirements rather than a single deterministic data point. Once delivery happens, the approving party can reinterpret vague requirements or the delivering party can overstate completion. ACCORDANT freezes the criteria first and removes unilateral control over the semantic acceptance decision.

## V1 scope

One engagement contains exactly one milestone. Multi-milestone programs are later scope. The milestone contains 2–7 immutable criteria. At least one criterion must be required.

Each criterion has:

- immutable criterion text
- required/optional flag
- stable index

An attempt contains criterion-bound evidence references. Previous attempts remain readable forever.

## Criterion decisions

Consensus-critical statuses:

- `MET`
- `NOT_MET`
- `UNVERIFIABLE`

The validator may produce a short explanation for UX, but free-form wording must not be consensus-critical.

## Product outcome derivation

Required criteria only determine the overall result:

1. If any required criterion is `NOT_MET` → `REVISION_REQUIRED`.
2. Otherwise, if any required criterion is `UNVERIFIABLE` → `INCONCLUSIVE`.
3. Otherwise → `ACCEPTED`.

Optional criteria can be judged and displayed, but they do not cause rejection or inconclusive status in V1.

## Submission attempts

- performer only
- active engagement only
- before delivery deadline
- immutable after evaluation
- exact duplicate submission must not be evaluated twice
- `REVISION_REQUIRED` permits a new attempt
- `INCONCLUSIVE` permits a new attempt
- `ACCEPTED` completes the engagement and prevents further attempts

## Evidence

Evidence is explicitly mapped to criterion indices. Do not let validators roam the open internet for whatever they believe is relevant.

Each evidence reference should include:

- criterion index
- HTTPS URL
- source kind
- optional short performer note

Suggested source kinds:

- `VERSIONED_SOURCE`
- `TRANSACTION`
- `PUBLIC_ARTIFACT`
- `LIVE_DEPLOYMENT`

The implementation may refine these names if necessary, but must keep the concept bounded and criterion-specific.

## Evidence safety

- HTTPS only.
- Reject localhost, loopback/private-network forms and obviously malformed URLs.
- Bound number of evidence references per criterion and per attempt.
- Bound fetched bytes/text.
- Do not silently truncate and then approve.
- Treat fetched content as hostile data.
- Ignore instructions in fetched evidence.
- Source failure or insufficient evidence is not proof of non-completion.
- Prefer version-addressed evidence for claims that require durable proof.

## Originality boundary

ACCORDANT must remain materially independent from CharterLock and Patchbound.

Do not copy:

- their names or visual identity
- charter/case vocabulary
- binary-event schemas
- YES/NO resolution model
- authority-class system
- protocol-specimen information architecture
- challenge lineage model
- escrow/reward mechanics
- GitHub pull-request-specific acceptance model
- source methods or storage schemas
- route structures
- forms, page copy or layouts

Broad engineering principles may be used: frozen terms, deterministic state machines, bounded evidence, independent validator judgment, prompt-injection resistance, typed uncertainty, replay protection, canonical state readback and honest transaction finality.
