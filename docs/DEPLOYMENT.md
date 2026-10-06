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

- Contract address: `0x36aeEf2E1FB5495937eeB483215BAeb20ce9a1e6`.
- Deployment transaction: `0x334abe23fa1b1c016c599e45f826d9ae27c59628e4913aa60534125c9795f1e6`.
- Deployment explorer: https://explorer-studio.genlayer.com/tx/0x334abe23fa1b1c016c599e45f826d9ae27c59628e4913aa60534125c9795f1e6
- Deployment status: `FINALIZED`; result: `MAJORITY_AGREE`.
- Deployment source SHA-256: `2070462C602DA537D40C05AA20BA331B9664A993A4AD770DE9A38645B6B9DB90`.
- Matching local source commit: recorded after this deployment record update; the source SHA above matches the deployed file.
- Production frontend URL: https://accordant.vercel.app
- Vercel project: `bibidees-projects/accordant`.
- Production deployment: https://vercel.com/bibidees-projects/accordant/7zJ2PcBKwr17XuHjbxFh59YxRkr4 (`READY`).
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
- `npm test` → blocked by the restricted Windows workspace path: Vitest/esbuild cannot resolve the config from the parenthesized path and reports `Cannot read directory "../../..": Access is denied`. The test suite was not represented as passing.
- Direct Mode (`gltest`/`genlayer-test` 0.1.1) → passed; the repository's current Direct Mode coverage contains one outcome-precedence invariant test.
- `genlayer schema 0x36aeEf2E1FB5495937eeB483215BAeb20ce9a1e6 --rpc https://studio.genlayer.com/api` → passed; schema includes all 10 public methods with the expected read/write flags and return types.
- `genlayer receipt 0x334abe23fa1b1c016c599e45f826d9ae27c59628e4913aa60534125c9795f1e6 --status FINALIZED` → passed; receipt status `FINALIZED`, result `MAJORITY_AGREE`.
- Live two-wallet lifecycle evidence on the final contract:
  - Engagement `1`: create `0xa5cf79154008e11a52c12b13bb292506b6eda74f035fda5171f72e5073a36f4f`, accept `0x2f0acd3707bf6d6887c049a94edb3d5e46734888d55e3940461136a1e155350e`; attempt `0x463e31a8a1152b38921633b1294a93217caa15a14573eca256a86a7101b57a55` was `INCONCLUSIVE` for oversized HTML, then retry `0xe4ae75bcbc43a986ccaecae6a54df5822d9ff7a6afff5108d14dc8841468a07f` was `ACCEPTED`; canonical state `COMPLETED`.
  - Engagement `2`: create `0xf2fd84e12434aa2274f64230b2cd57548f54a0fc9e7b32a26bf2711acb8f24bc`, accept `0x9ea3feba5f33479c82478dcac54dda247d7af850ba68ee2fb81876eeabc70796`; RFC 1149 evidence attempt `0x9565116fa2c28cf1b4cde0ca2ddd2e2aff3ffdd6b44e0c29a390a92c151520d1` returned `REVISION_REQUIRED`, and corrected retry `0xf16171b16730bc4558bd8ce01034421f2da78da418f93280ee169c466b51aeb8` returned `ACCEPTED`; canonical state `COMPLETED`.
  - Engagement `3`: create `0xbf6ffa789f6061e20c35629390c3a70422de31bb9bb792aef4d8647b1606e507`, accept `0x2c3d1f7d606b6d216e0b42f1a42bbb878a8bd8afbebc1af261df4c9b42d1d69c`, unavailable-source attempt `0x1e60f91fa097d75c3e4c986ae21fdb20e395bfacbc3867f263d9009cbf25082f` returned `INCONCLUSIVE`; canonical state remained `ACTIVE`.
  - Engagement `4`: create `0x0eebb6a018ae474a9b58722f12f266c007d4232431467b1ed408124665241d5e`, requester expiry close `0x5a16c5f6e07ac5fdfbc5b02211a0b67741a20466da38cdaac02f3d740d6f26a6`; canonical state `EXPIRED`.
- Production browser verification → passed for the public landing page and `/work`, `/work/new`, `/activity`, and `/account` routes at desktop size; responsive verification passed at `390×844` on `/work/new` and `/account`. The account route visibly reported Studionet `61999`, the RPC, and the final contract address. No browser console errors were observed. The verification browser had no wallet extension connected, so wallet-signing UI was not claimed as a production-browser pass; two-wallet signing was verified against the final contract through the unlocked CLI keychain.

## Manual deployment and verification actions

1. No manual deployment action remains for the recorded V1 scope.
