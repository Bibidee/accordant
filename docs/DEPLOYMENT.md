# ACCORDANT Deployment Record

This file records only facts observed in this workspace, including the production browser verification below.

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

- Contract address: `0xa802181825D027b08141716617E9d6Bf0dEfb16d`.
- Deployment transaction: `0x4d7be47b7837e5ddbdb54ad8ea06f8bf5de9d1f895169cf5ef4b9653fbaab9d1`.
- Deployment explorer: https://explorer-studio.genlayer.com/tx/0x4d7be47b7837e5ddbdb54ad8ea06f8bf5de9d1f895169cf5ef4b9653fbaab9d1
- Deployment status: `FINALIZED`; result: `MAJORITY_AGREE`.
- Deployment source SHA-256: `E68FFE58EC1AFBF831A2E754E65A313B0B7D2599959DD93D2198C89FE3D3D86F`.
- The deployed source hash was computed immediately before deployment and matches `contracts/accordant.py` used by the deployment command.
- Production frontend URL: https://accordant.vercel.app
- Vercel project: `bibidees-projects/accordant`.
- Production deployment: https://vercel.com/bibidees-projects/accordant/DiySH7dsz6Wk3Jq2NuC8DosAbxtP (`READY`).
- Production variables configured: `NEXT_PUBLIC_ACCORDANT_CONTRACT`, `NEXT_PUBLIC_GENLAYER_RPC`, and `NEXT_PUBLIC_GENLAYER_CHAIN_ID`.

The deployment command used was:

```text
node node_modules/genlayer/dist/index.js deploy --contract contracts/accordant.py --rpc https://studio.genlayer.com/api
```

The unlocked `fresh-alice` account signed the deployment. The resulting contract address and finalized receipt above were queried again after deployment.

## Verification run

- `node node_modules/genlayer/dist/index.js --version` → `0.39.1`.
- `npm run network:check` → passed; Studionet 61999 only.
- `npm run typecheck` → passed.
- `npm run lint` → passed.
- `npm run build -- --webpack` → passed; all required routes compiled.
- `npm test` → passed with unrestricted filesystem access; `tests/ui/lifecycle.test.ts` passed all 5 tests.
- Direct Mode (`genlayer-test` 0.29.2) → passed; all 5 contract test groups passed against the actual Direct Mode VM.
- `genlayer schema 0xa802181825D027b08141716617E9d6Bf0dEfb16d --rpc https://studio.genlayer.com/api` → passed; the deployed schema includes the expected public methods and pagination signatures.
- `genlayer receipt 0x4d7be47b7837e5ddbdb54ad8ea06f8bf5de9d1f895169cf5ef4b9653fbaab9d1 --status FINALIZED` → passed; receipt status `FINALIZED`, result `MAJORITY_AGREE`.
- Live two-wallet lifecycle suite against the new contract address passed with fresh engagements and finalized write receipts:
  - Engagement `8`: create `0xfb8162b89dd37c4b7614fc3fa8b20a4950678ee7ae905fe004aa575942751661`, accept `0x3ab5e1dd1d072318c15c075acd37d42025b2b58f7d8ab0e8ece4766555993d5f`, evaluate `0xc74ee3be8583745fe0eba25a787d656a57e520d9d697190ad862344bda1920e`; canonical `ACCEPTED` / `COMPLETED`.
  - Engagement `9`: create `0xa89ccb41ed3e40fc03e11e895604c7c3d4136bf122fd1d31cbaf1be889ac4170`, accept `0xd51427eb2907d45cc42319bfb96b0cad3e73db6caa3340ac449d897afcb958df`, evaluate `0x44da60ca07573a5f55c38481b1f8de24cb46175c3d5eb8e049238be09c521ec9`; canonical `REVISION_REQUIRED` / `ACTIVE`.
  - Engagement `10`: create `0x13bb84b7642e98ce1000a218a22ac95079c7b194e9ae9e88d5271745b7aea112`, accept `0x53d66e9ab0aceaf861c7e358c08268b4fdd49ec337848ba588b2244d9533eb2b`, evaluate `0x6da15114ca08c19ab077cb57f499f427fcb8db4585e71967502a4bb77dc2df47`; canonical `INCONCLUSIVE` / `ACTIVE` for intentionally unavailable evidence.
- Production browser verification passed at desktop size for `/`, `/work`, `/work/new`, `/activity`, and `/account`, and at `390×844` for `/work/new` and `/account`. The live account surface showed Studionet `61999` and contract `0xa802181825D027b08141716617E9d6Bf0dEfb16d`; no visible route or layout errors were observed. Wallet signing was verified separately through the two unlocked CLI wallets.

## Manual deployment and verification actions

1. No manual deployment action remains for the recorded V1 scope.
