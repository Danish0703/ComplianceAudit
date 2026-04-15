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
