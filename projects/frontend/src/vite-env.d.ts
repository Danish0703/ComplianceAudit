/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENVIRONMENT: string
  readonly VITE_BACKEND_URL: string

  readonly VITE_ALGOD_TOKEN: string
  readonly VITE_ALGOD_SERVER: string
  readonly VITE_ALGOD_PORT: string
  readonly VITE_ALGOD_NETWORK: string

  readonly VITE_INDEXER_TOKEN: string
  readonly VITE_INDEXER_SERVER: string
  readonly VITE_INDEXER_PORT: string

  readonly VITE_KMD_TOKEN: string
  readonly VITE_KMD_SERVER: string
  readonly VITE_KMD_PORT: string
  readonly VITE_KMD_PASSWORD: string
  readonly VITE_KMD_WALLET: string
  readonly VITE_COUNTER_APP_ID?: string
  readonly VITE_TXN_VALIDATOR_APP_ID?: string
  readonly VITE_RISK_SCORER_APP_ID?: string
  readonly VITE_ALERT_ENGINE_APP_ID?: string
  readonly VITE_CERTIFICATE_MANAGER_APP_ID?: string
  readonly VITE_BLACKLIST_WHITELIST_APP_ID?: string
  readonly VITE_COMPLIANCE_AUDIT_APP_ID?: string
  readonly VITE_BANK_APP_ID?: string
  readonly VITE_PINATA_JWT?: string
  readonly VITE_PINATA_GATEWAY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
