# ACCORDANT V1 Architecture Lock

## Canonical architecture

```text
USER
-> NEXT.JS APP ROUTER + TYPESCRIPT
-> INJECTED EIP-1193 WALLET
-> GENLAYER STUDIONET 61999
-> ONE ACCORDANT INTELLIGENT CONTRACT
-> GENLAYER VALIDATOR JUDGMENT
-> CONTRACT STATE
-> FRONTEND
```

## No application backend

Do not add Supabase, Firebase, Express, Railway, Cloudflare Workers, server databases, API decision services, authoritative Next.js API routes, authoritative Server Actions, cron, queues, backend wallets, centralized AI inference, hidden operator tooling or admin adjudication.

Browser local storage is allowed only for non-authoritative transaction recovery/convenience. Canonical product state must always be reconstructed from the Intelligent Contract.

## Why one Intelligent Contract

V1 has one coherent authority boundary: engagement terms, attempts, criterion decisions and outcomes. Splitting these into multiple contracts adds coordination and failure surface without a second genuine trust boundary. Use one contract unless implementation evidence proves a second contract is necessary.

## Canonical records

The contract should own at minimum:

- engagements
- participants
- immutable criteria
- attempt history
- evidence references or canonical submission digest
- per-criterion decisions
- overall attempt result
- replay protection
- wallet-to-engagement indexes if needed for frontend reads

## Authority rules

Requester:
- can create a proposal
- can cancel only while `PROPOSED`
- cannot edit terms after creation
- cannot accept on behalf of performer
- cannot set or override decisions

Performer:
- can accept or decline while `PROPOSED`
- can submit attempts only while `ACTIVE`
- cannot edit criteria
- cannot set or override decisions

Validators:
- decide only the semantic question for the frozen criteria using submitted evidence
- cannot mutate participants, criteria, deadlines, attempt identity or lifecycle legality

Contract deterministic logic:
- enforces authorization
- enforces deadlines
- derives overall result from criterion statuses
- controls terminal states
- prevents replay
- persists canonical history

## Transaction lifecycle

Frontend must explicitly represent:

1. wallet approval requested
2. signature rejected or signed
3. transaction submitted with exact hash
4. consensus progressing
5. GenLayer `ACCEPTED` as provisional
6. execution/finality progressing
7. final transaction status
8. canonical contract readback
9. expected product state confirmed or mismatch surfaced

Never blindly rebroadcast after refresh or polling timeout when a hash already exists.
