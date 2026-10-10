# Handoff Status

The implementation and production handoff are complete for the browser/client and contract source integration. The app uses the pinned `genlayer-js` 1.1.8 adapter, injected EIP-1193 wallets, canonical contract reads, real write calls, transaction recovery, and the required App Router routes. The Accordant contract is deployed and finalized on Studionet, and the frontend is live on Vercel. A fresh Brave injected-wallet lifecycle has been completed on production and is recorded in `docs/DEPLOYMENT.md`.

The production URL is https://accordant.vercel.app. Production route verification and the final production configuration are recorded in `docs/DEPLOYMENT.md`; the current Vercel deployment is `dpl_DkWLv3wJnGTVqxSK6WTo5YtkEgrh`.

The frontend concurrency hardening and expiry reconciliation remain in the production runtime lineage described in `docs/DEPLOYMENT.md`. Evidence submissions reconcile against the exact digest/evidence JSON in a bounded scan of attempts appended after the baseline, with fail-closed unique matching and correct historical/latest state semantics. Latest-first index reads tolerate one count/fetch race with a single recalculated retry. The completed-state evidence route is closed and cannot append another attempt after canonical acceptance. The current UI suite and production deployment details are recorded in `docs/DEPLOYMENT.md`.

The current economic contract was deployed fresh with GenLayer CLI 0.39.1 and finalized successfully. Contract: [`0xF34B9BbA585137b05Fc00a3921297614661D836D`](https://explorer-studio.genlayer.com/address/0xF34B9BbA585137b05Fc00a3921297614661D836D). Deployment transaction: [`0x788bf4a4befc5b03c688791766e1e6c60e142839dbff8d2d7208588731c69ecb`](https://explorer-studio.genlayer.com/tx/0x788bf4a4befc5b03c688791766e1e6c60e142839dbff8d2d7208588731c69ecb). The live two-wallet lifecycle suite and production verification are recorded in `docs/DEPLOYMENT.md`.

The production routes were verified at `1280×720` and exact interactive `390×844` mobile QA was completed without horizontal overflow; the responsive mobile menu exposed the expected navigation links. The browser proofs are separate: Agreement `15` records `INCONCLUSIVE → INCONCLUSIVE → ACCEPTED → COMPLETED`, while fresh Brave Agreement `16` records `REVISION_REQUIRED → ACCEPTED → COMPLETED` with immutable commit-addressed Version A/B evidence. The `Protect master` ruleset is active with ID `24645498`; current master verification should always refer to the latest successful workflow run rather than a fixed historical run. Superseded contract addresses remain historical only and are listed in `docs/DEPLOYMENT.md`.

## Historical deployment addresses

These addresses and the associated transaction are retained for audit history only:

- `0xd9a36f60D41bb343590274b9E905A314Ac6D55A6` — superseded frontend/evidence deployment.
- `0xc9eCe9f1AF8De797d27836de4Ad8599d813aA620` — superseded economic deployment; transaction `0xd4d089eae93409b9c89362a8bc19cd60c6a68565308a2cbcb3efd69521aafba4`.
