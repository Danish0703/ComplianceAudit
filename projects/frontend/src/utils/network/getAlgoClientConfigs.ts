import { AlgoViteClientConfig, AlgoViteKMDConfig } from '../../interfaces/network'

function resolveNetworkPort(server: string, envPort: string | undefined, localPort: string): string {
  if (envPort && envPort.trim().length > 0) {
    return envPort
  }

  return server.includes('localhost') ? localPort : '443'
}

export function getAlgodConfigFromViteEnvironment(): AlgoViteClientConfig {
  const server = import.meta.env.VITE_ALGOD_SERVER || 'http://localhost'
  return {
    server,
    port: resolveNetworkPort(server, import.meta.env.VITE_ALGOD_PORT, '4001'),
    token: import.meta.env.VITE_ALGOD_TOKEN || 'a'.repeat(64),
    network: import.meta.env.VITE_ALGOD_NETWORK || 'localnet',
  }
}

export function getIndexerConfigFromViteEnvironment(): AlgoViteClientConfig {
  const server = import.meta.env.VITE_INDEXER_SERVER || 'http://localhost'
  return {
    server,
    port: resolveNetworkPort(server, import.meta.env.VITE_INDEXER_PORT, '8980'),
    token: import.meta.env.VITE_INDEXER_TOKEN || 'a'.repeat(64),
    network: import.meta.env.VITE_ALGOD_NETWORK || 'localnet',
  }
}

export function getKmdConfigFromViteEnvironment(): AlgoViteKMDConfig {
  return {
    server: import.meta.env.VITE_KMD_SERVER || 'http://localhost',
    port: import.meta.env.VITE_KMD_PORT || '4002',
    token: import.meta.env.VITE_KMD_TOKEN || 'a'.repeat(64),
    wallet: import.meta.env.VITE_KMD_WALLET || 'unencrypted-default-wallet',
    password: import.meta.env.VITE_KMD_PASSWORD || '',
  }
}
