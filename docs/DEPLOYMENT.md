# ACCORDANT Deployment Record

This file records only facts observed in this workspace. It is intentionally incomplete until a human unlocks a funded deployment account and performs production browser verification.

## Target

- Network: GenLayer Studionet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- Repository-local CLI: `0.39.1` (verified with the installed CLI entry point)
- `genlayer-js`: `1.1.8`

## Implementation completed locally

- One contract source: `contracts/accordant.py`.
- One frontend: Next.js App Router + TypeScript.
- Browser writes use the injected EIP-1193 provider through `genlayer-js`.
- Browser reads use GenLayer `gen_call` through the same adapter.
- Local storage contains only transaction recovery pointers; canonical engagement and attempt state is read from the contract.
- No application backend, database, server signer, API route, Server Action, queue or centralized outcome service was added.

## Deployment status

- Contract address: **not deployed**.
- Deployment transaction: **not available**.
- Source SHA-256: `86E20FBBE7BFF7A506AA620A2261CCBBEFD7D16FAE9380C4AF3BDD552736521B` for the current local source; this is not a deployed-source claim.
- Local final Git commit: `950e8872fe8ce7d202c94711ad1ac81d6436af61` on `master`; no remote URL is configured and this commit is not a deployed-source match.
- Production frontend URL: **not deployed**.

The real deployment command is:

```text
node node_modules/genlayer/dist/index.js deploy --contract contracts/accordant.py --rpc https://studio.genlayer.com/api
```

It reached the configured keystore password prompt and failed after invalid password attempts. No guessed password was used and no deployment evidence was created.

## Verification run

- `node node_modules/genlayer/dist/index.js --version` → `0.39.1`.
- `npm run network:check` → passed; Studionet 61999 only.
- `npm run typecheck` → passed.
- `npm run lint` → passed.
- `npm run build -- --webpack` → passed; all required routes compiled.
- `npm test` → blocked by the restricted Windows workspace path: Vitest/esbuild cannot resolve the config from the parenthesized path and reports `Cannot read directory "../../..": Access is denied`. The test suite was not represented as passing.
- Direct Python/GenLayer tests → not run; no Python interpreter is available in this environment.

## Manual deployment and verification actions

1. Unlock the intended funded deployment account for the repository-local GenLayer CLI.
2. Run the deployment command above on Studionet 61999 and record the real address, hash, explorer URL and deployed-source hash.
3. Set `NEXT_PUBLIC_ACCORDANT_CONTRACT` to that address and rerun typecheck, lint, tests and build.
4. Run Direct Mode and the real accepted, revision/retry, inconclusive and expiry lifecycles with two wallets.
5. Deploy the frontend to Vercel with the same public contract address and perform desktop/mobile browser verification.
