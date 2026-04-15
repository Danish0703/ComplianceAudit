# ComplianceAudit

ComplianceAudit is an Algorand-based RegTech dApp that demonstrates end-to-end compliance workflows:
- on-chain transaction validation
- risk scoring
- alerting
- certificate and audit visibility
- wallet-driven user actions from a React frontend

This repository is an AlgoKit workspace that contains both smart contracts and the frontend app.

## Table of Contents

- Overview
- Key Features
- Workspace Architecture
- Repository Structure
- Smart Contracts
- Frontend Modules
- Tech Stack
- Prerequisites
- Setup and Local Development
- Environment Variables
- Build, Test, and Lint Commands
- Deployment
- Contract and App ID Workflow
- Common Issues and Troubleshooting
- Development Workflow Recommendations
- Additional Documentation

## Overview

The project is organized as a monorepo:
- `projects/contracts`: Algorand smart contracts and contract-side tooling
- `projects/frontend`: Vite + React frontend that interacts with deployed app IDs

The frontend consumes `VITE_*` environment variables for Algod/Indexer configuration and contract app IDs. If app IDs are missing for the selected network, related features fail early with clear errors.

## Key Features

- Multi-contract compliance system:
  - `TxnValidator`
  - `RiskScorer`
  - `AlertEngine`
  - `CertificateManager`
  - `BlacklistWhitelist`
  - `ComplianceAudit`
  - `Bank` and `Counter` demos
- Wallet integration (LocalNet or TestNet/MainNet compatible)
- Compliance dashboard and monitoring UI components
- Vercel-ready frontend deployment with SPA rewrites
- Network-aware client configuration driven by environment variables

## Workspace Architecture

At the root, AlgoKit declares this repo as a workspace:

- `.algokit.toml`
  - project type: `workspace`
  - build pipeline includes both contracts and frontend projects

Data flow at a high level:
1. User connects wallet in frontend.
2. Frontend reads Algod/Indexer and app IDs from `VITE_*`.
3. Frontend calls generated TypeScript clients under `projects/frontend/src/contracts`.
4. Contracts execute on Algorand and return state or method results.
5. Frontend services and components render risk/compliance/audit outcomes.

## Repository Structure

```text
.
├─ .algokit.toml
├─ projects/
│  ├─ contracts/
│  │  ├─ smart_contracts/
│  │  │  ├─ txn_validator/
│  │  │  ├─ risk_scorer/
│  │  │  ├─ alert_engine/
│  │  │  ├─ certificate_manager/
│  │  │  ├─ blacklist_whitelist/
│  │  │  ├─ compliance_audit/
│  │  │  ├─ bank/
│  │  │  ├─ counter/
│  │  │  └─ artifacts/
│  │  ├─ tests/
│  │  └─ README.md
│  └─ frontend/
│     ├─ src/
│     │  ├─ components/
│     │  ├─ contracts/
│     │  ├─ routes/
│     │  ├─ services/
│     │  └─ utils/
│     ├─ package.json
│     └─ vercel.json
└─ README.md
```

## Smart Contracts

Contracts are located in `projects/contracts/smart_contracts`.

Core compliance-related contract folders:
- `txn_validator`
- `risk_scorer`
- `alert_engine`
- `certificate_manager`
- `blacklist_whitelist`
- `compliance_audit`

Additional demo/support contracts:
- `bank`
- `counter`

Generated artifacts are available under `projects/contracts/smart_contracts/artifacts`.

## Frontend Modules

Frontend app lives in `projects/frontend`.

Important areas:
- `src/components`: UI and feature screens (monitoring, risk, audit, wallet, assets)
- `src/contracts`: generated TypeScript clients for contracts
- `src/services/complianceService.ts`: central service layer for compliance contract interactions
- `src/utils/network/getAlgoClientConfigs.ts`: reads Algod/Indexer/KMD settings from Vite env
- `src/utils/pinata.ts`: optional IPFS upload support for NFT flows
- `src/routes`: app route definitions

Notable components in `src/components`:
- `TransactionMonitor.tsx`
- `OnChainTransparency.tsx`
- `ComplianceAuditPanel.tsx`
- `RiskHeatmap.tsx`
- `AlertBoard.tsx`
- `CertificateManager.tsx`
- `Bank.tsx`
- `CreateASA.tsx`
- `MintNFT.tsx`

## Tech Stack

- Algorand + AlgoKit
- TypeScript
- React 18 + Vite 5
- Tailwind CSS + UI helpers
- `@algorandfoundation/algokit-utils`
- `algosdk`
- `@txnlab/use-wallet-react`
- Jest + Playwright
- Vercel deployment for frontend

## Prerequisites

- Node.js `>=20`
- npm `>=9`
- Docker (needed for localnet workflows)
- AlgoKit CLI `>=2.0.0`

Install AlgoKit: [AlgoKit CLI](https://github.com/algorandfoundation/algokit-cli#install)

## Setup and Local Development

From repository root:

```bash
algokit project bootstrap all
algokit project run build
```

Run frontend:

```bash
cd projects/frontend
npm install
npm run dev
```

Optional localnet lifecycle commands:

```bash
algokit localnet start
algokit localnet reset
```

## Environment Variables

Frontend uses `VITE_*` variables from `projects/frontend/.env`, `.env.local`, or hosting env settings.

### Required network variables

```bash
VITE_ENVIRONMENT=test

VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_ALGOD_PORT=
VITE_ALGOD_TOKEN=
VITE_ALGOD_NETWORK=testnet

VITE_INDEXER_SERVER=https://testnet-idx.algonode.cloud
VITE_INDEXER_PORT=
VITE_INDEXER_TOKEN=
```

### Contract app IDs (required for compliance flows)

```bash
VITE_COUNTER_APP_ID=
VITE_TXN_VALIDATOR_APP_ID=
VITE_RISK_SCORER_APP_ID=
VITE_ALERT_ENGINE_APP_ID=
VITE_CERTIFICATE_MANAGER_APP_ID=
VITE_BLACKLIST_WHITELIST_APP_ID=
VITE_COMPLIANCE_AUDIT_APP_ID=
VITE_BANK_APP_ID=
```

### Optional variables

Local wallet/KMD (mainly LocalNet):
```bash
VITE_KMD_SERVER=http://localhost
VITE_KMD_PORT=4002
VITE_KMD_TOKEN=
VITE_KMD_WALLET=unencrypted-default-wallet
VITE_KMD_PASSWORD=
```

NFT/IPFS:
```bash
VITE_PINATA_JWT=
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs
```

## Build, Test, and Lint Commands

### Workspace-level

From root:

```bash
algokit project run build
algokit project run test
```

### Frontend-level

From `projects/frontend`:

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run lint:fix
npm run test
npm run playwright:test
```

## Deployment

## Frontend Deployment on Vercel

Vercel config already exists at `projects/frontend/vercel.json` and includes SPA rewrites.

From `projects/frontend`:

```bash
npx vercel login
npx vercel --prod
```

If importing via Vercel dashboard, use:
- Root Directory: `projects/frontend`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Before deploying, add all required `VITE_*` variables in Vercel Project Settings (especially contract app IDs).

## Contract and App ID Workflow

Typical workflow for new network deployment:
1. Deploy contracts on target network.
2. Capture resulting app IDs.
3. Update frontend env vars (`VITE_*_APP_ID`) for that network.
4. Rebuild frontend.
5. Redeploy frontend (or restart local dev server).

If app IDs are absent, the frontend intentionally throws configuration errors to avoid sending invalid calls.

## Common Issues and Troubleshooting

- `TxnValidator app ID is not configured for this network`
  - Set `VITE_TXN_VALIDATOR_APP_ID` for the active environment and redeploy/restart.
- `RiskScorer/AlertEngine/... app ID is not configured`
  - Same root cause: missing contract app IDs in environment.
- Wallet connected but transactions fail
  - Verify app IDs belong to the same network as `VITE_ALGOD_NETWORK`.
- Vercel site shows old behavior
  - Trigger redeploy and hard-refresh browser cache.
- Localnet issues
  - Run `algokit localnet reset`, then rebuild/restart.

## Development Workflow Recommendations

- Keep local env values in `projects/frontend/.env.local` (git-ignored)
- Treat Vercel env vars as source of truth for production
- Avoid mixing LocalNet and TestNet IDs in the same env file
- After contract redeploys, always rotate app IDs in frontend config
- Run lint/build checks before pushing

## Additional Documentation

For deeper project planning and architecture docs, refer to:
- `README_DOCUMENTATION_INDEX.md`
- `COMPLIANCE_AUDIT_PLAN.md`
- `COMPLIANCE_AUDIT_IMPLEMENTATION.md`
- `COMPLIANCE_AUDIT_ARCHITECTURE.md`
- `COMPLIANCE_AUDIT_QUICK_REFERENCE.md`

## License

This project follows the repository license and third-party dependency licenses.
# ComplianceAudit

ComplianceAudit is an Algorand-based RegTech dApp for transaction monitoring, risk scoring, on-chain validation, and audit visibility.

This repository is an AlgoKit workspace with:
- Smart contracts in `projects/contracts`
- React + Vite frontend in `projects/frontend`

## Features

- On-chain compliance app suite (TxnValidator, RiskScorer, AlertEngine, and related contracts)
- Wallet-connected frontend using Algorand ecosystem tooling
- Network-aware config via `VITE_*` environment variables
- Vercel-ready frontend deployment (`projects/frontend/vercel.json`)

## Tech Stack

- Algorand + AlgoKit
- TypeScript
- React + Vite + Tailwind
- `@algorandfoundation/algokit-utils`
- Vercel (frontend hosting)

## Repository Structure

```text
.
├─ projects/
│  ├─ contracts/      # Smart contracts and generated artifacts
│  └─ frontend/       # React frontend dApp
├─ .algokit.toml
└─ README.md
```

## Prerequisites

- Node.js 20+
- npm 9+
- Docker (for LocalNet)
- AlgoKit CLI

Install AlgoKit: [AlgoKit CLI docs](https://github.com/algorandfoundation/algokit-cli#install)

## Quick Start (Local Development)

1. Bootstrap workspace dependencies:

```bash
algokit project bootstrap all
```

2. Build projects:

```bash
algokit project run build
```

3. Run frontend:

```bash
cd projects/frontend
npm run dev
```

## Frontend Environment Variables

Create `projects/frontend/.env.local` (or `.env`) with your target network values.

Required for TestNet:

```bash
VITE_ENVIRONMENT=test

VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_ALGOD_PORT=
VITE_ALGOD_TOKEN=
VITE_ALGOD_NETWORK=testnet

VITE_INDEXER_SERVER=https://testnet-idx.algonode.cloud
VITE_INDEXER_PORT=
VITE_INDEXER_TOKEN=

VITE_COUNTER_APP_ID=<app_id>
VITE_TXN_VALIDATOR_APP_ID=<app_id>
VITE_RISK_SCORER_APP_ID=<app_id>
VITE_ALERT_ENGINE_APP_ID=<app_id>
VITE_CERTIFICATE_MANAGER_APP_ID=<app_id>
VITE_BLACKLIST_WHITELIST_APP_ID=<app_id>
VITE_COMPLIANCE_AUDIT_APP_ID=<app_id>
VITE_BANK_APP_ID=<app_id>
```

Optional for NFT/IPFS flows:

```bash
VITE_PINATA_JWT=<your_pinata_jwt>
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs
```

## Build & Test Commands

From `projects/frontend`:

```bash
npm run build
npm run lint
npm run test
```

From workspace root:

```bash
algokit project run build
algokit project run test
```

## Deploy Frontend to Vercel

This project is already configured for Vercel in `projects/frontend/vercel.json`.

### CLI deployment

From `projects/frontend`:

```bash
npx vercel login
npx vercel --prod
```

### Dashboard settings (if importing repo)

- Root Directory: `projects/frontend`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

### Important

Set all required `VITE_*` environment variables in Vercel Project Settings before production deployment, especially the contract app IDs (e.g., `VITE_TXN_VALIDATOR_APP_ID`).

## Common Issues

- `TxnValidator app ID is not configured for this network`
  - Set `VITE_TXN_VALIDATOR_APP_ID` in your environment (local and Vercel) and redeploy.
- Wallet connects but transactions fail
  - Verify network and app IDs match the deployed contracts.
- Changes not visible on Vercel
  - Trigger a redeploy and hard refresh browser cache.

## Documentation

Additional planning and architecture docs are available in the repo root (for example `README_DOCUMENTATION_INDEX.md` and ComplianceAudit planning documents).

## License

This project inherits the license and terms from this repository and its dependencies.
