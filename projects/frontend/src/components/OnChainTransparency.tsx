import { useWallet } from '@txnlab/use-wallet-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

type HealthStatus = 'idle' | 'ok' | 'error'

const appContracts = [
  { name: 'TxnValidator', envKey: 'VITE_TXN_VALIDATOR_APP_ID' },
  { name: 'RiskScorer', envKey: 'VITE_RISK_SCORER_APP_ID' },
  { name: 'AlertEngine', envKey: 'VITE_ALERT_ENGINE_APP_ID' },
  { name: 'CertificateManager', envKey: 'VITE_CERTIFICATE_MANAGER_APP_ID' },
  { name: 'BlacklistWhitelist', envKey: 'VITE_BLACKLIST_WHITELIST_APP_ID' },
  { name: 'ComplianceAudit', envKey: 'VITE_COMPLIANCE_AUDIT_APP_ID' },
  { name: 'Bank', envKey: 'VITE_BANK_APP_ID' },
  { name: 'Counter', envKey: 'VITE_COUNTER_APP_ID' },
] as const

const featureTraceability = [
  { feature: 'Transaction Validation', contract: 'TxnValidator', state: 'Method return + block-status boxes' },
  { feature: 'Risk Scoring', contract: 'RiskScorer', state: 'Method return + threshold globals' },
  { feature: 'Alert Emission', contract: 'AlertEngine', state: 'Alert count and latest alert boxes' },
  { feature: 'Certificate Issuance', contract: 'CertificateManager', state: 'Global counter + certificate box maps' },
  { feature: 'Blacklist / Whitelist', contract: 'BlacklistWhitelist', state: 'Blacklist/whitelist box maps' },
  { feature: 'Compliance Audit', contract: 'ComplianceAudit', state: 'Consent, report, evidence, and org-verification boxes' },
  { feature: 'Bank Operations', contract: 'Bank', state: 'Per-account deposit box state and transfer call logs' },
]

const OnChainTransparency = () => {
  const { activeAddress } = useWallet()
  const algod = getAlgodConfigFromViteEnvironment()
  const indexer = getIndexerConfigFromViteEnvironment()
  const [algodHealth, setAlgodHealth] = useState<HealthStatus>('idle')
  const [indexerHealth, setIndexerHealth] = useState<HealthStatus>('idle')
  const [algodRound, setAlgodRound] = useState<number | null>(null)

  const explorerNetwork = useMemo(() => {
    const network = (algod.network || '').toLowerCase()
    if (network.includes('test')) return 'testnet'
    if (network.includes('main')) return 'mainnet'
    return 'localnet'
  }, [algod.network])

  const loraBase = `https://lora.algokit.io/${explorerNetwork}`

  useEffect(() => {
    const checkAlgod = async () => {
      setAlgodHealth('idle')
      setAlgodRound(null)
      try {
        const normalized = `${algod.server}${algod.port ? `:${algod.port}` : ''}`.replace(/\/$/, '')
        const response = await fetch(`${normalized}/v2/status`)
        if (!response.ok) {
          setAlgodHealth('error')
          return
        }
        const data = (await response.json()) as { 'last-round'?: number; lastRound?: number }
        const round = Number(data.lastRound ?? data['last-round'] ?? 0)
        setAlgodRound(Number.isFinite(round) && round > 0 ? round : null)
        setAlgodHealth('ok')
      } catch {
        setAlgodHealth('error')
      }
    }

    const checkIndexer = async () => {
      setIndexerHealth('idle')
      try {
        const normalized = `${indexer.server}${indexer.port ? `:${indexer.port}` : ''}`.replace(/\/$/, '')
        // A minimal Indexer call that doesn't require auth on AlgoNode endpoints.
        const response = await fetch(`${normalized}/health`)
        setIndexerHealth(response.ok ? 'ok' : 'error')
      } catch {
        setIndexerHealth('error')
      }
    }

    void checkAlgod()
    void checkIndexer()
  }, [])

  return (
    <div className="space-y-6 pt-2">
      <Card className="surface-elevated scroll-mt-24">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">Transparency</Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
              Explorer mapped
            </Badge>
          </div>
          <CardTitle className="text-2xl font-black">On-chain Transparency</CardTitle>
          <CardDescription>
            Every feature is mapped to contract app IDs and explorer paths so reviewers can independently verify state and transactions.
          </CardDescription>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Explorer Network</p>
              <p className="mt-1 text-sm font-bold text-foreground">{explorerNetwork}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Algod Reachability</p>
              <p className="mt-1 text-sm font-bold text-foreground">
                {algodHealth === 'ok' ? `OK${algodRound ? ` (round ${algodRound})` : ''}` : algodHealth === 'error' ? 'Error' : 'Checking'}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Indexer Reachability</p>
              <p className="mt-1 text-sm font-bold text-foreground">
                {indexerHealth === 'ok' ? 'OK' : indexerHealth === 'error' ? 'Error' : 'Checking'}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-border bg-card/80 shadow-sm backdrop-blur transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Network Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Algod:</span> {algod.server}
              {algod.port ? `:${algod.port}` : ''}
            </p>
            <p>
              <span className="font-semibold text-foreground">Indexer:</span> {indexer.server}
              {indexer.port ? `:${indexer.port}` : ''}
            </p>
            <p>
              <span className="font-semibold text-foreground">Network:</span> {algod.network || 'unknown'}
            </p>
            <p className="text-xs text-muted-foreground">Pure Web3 stack (frontend + contracts). No backend required.</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80 shadow-sm backdrop-blur transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Runtime Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
            <span
              className={`inline-block h-3 w-3 rounded-full ${
                algodHealth === 'ok' && indexerHealth === 'ok'
                  ? 'bg-emerald-500'
                  : algodHealth === 'error' || indexerHealth === 'error'
                    ? 'bg-red-500'
                    : 'bg-slate-400'
              }`}
            />
            <p className="text-sm font-semibold text-muted-foreground">
              Chain access:{' '}
              {algodHealth === 'ok' && indexerHealth === 'ok'
                ? 'Healthy'
                : algodHealth === 'error' || indexerHealth === 'error'
                  ? 'Unavailable'
                  : 'Checking'}
            </p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Health is derived from direct Algod + Indexer reachability checks (no backend dependency).
          </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Contract Registry</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {appContracts.map((item) => {
            const appId = import.meta.env[item.envKey] as string | undefined
            const hasValue = Boolean(appId && appId.trim().length > 0)
            return (
              <div key={item.name} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                <p className="mt-1 text-xs text-slate-600">{item.envKey}</p>
                <p className="mt-2 font-mono text-xs text-slate-800">{hasValue ? appId : 'Not configured'}</p>
                {hasValue && (
                  <a
                    href={`${loraBase}/application/${appId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-teal-700 underline underline-offset-2"
                  >
                    View on Explorer
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Connected Account Proof</h3>
        {activeAddress ? (
          <div className="mt-3 space-y-2">
            <p className="font-mono text-xs text-slate-800">{activeAddress}</p>
            <a
              href={`${loraBase}/account/${activeAddress}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-teal-700 underline underline-offset-2"
            >
              View Account on Explorer
            </a>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Connect wallet to expose account-level on-chain references.</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Feature Traceability Matrix</h3>
        <p className="mt-2 text-xs text-slate-500">This matrix shows exactly which contract and state surface each UI feature maps to.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-3 py-2 font-semibold">Feature</th>
                <th className="px-3 py-2 font-semibold">Contract</th>
                <th className="px-3 py-2 font-semibold">On-chain State</th>
              </tr>
            </thead>
            <tbody>
              {featureTraceability.map((item) => (
                <tr key={item.feature} className="border-b border-slate-100 text-slate-700">
                  <td className="px-3 py-2 font-semibold text-slate-900">{item.feature}</td>
                  <td className="px-3 py-2">{item.contract}</td>
                  <td className="px-3 py-2">{item.state}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Verification Shortcuts</h3>
        <div className="mt-3 space-y-2 text-xs text-slate-700">
          <p className="font-mono">GET {`${String(algod.server)}${algod.port ? `:${algod.port}` : ''}`.replace(/\/$/, '')}/v2/status</p>
          <p className="font-mono">GET {`${String(indexer.server)}${indexer.port ? `:${indexer.port}` : ''}`.replace(/\/$/, '')}/health</p>
          <p className="font-mono">Use the app IDs above to inspect contract state on explorer.</p>
        </div>
      </div>
    </div>
  )
}

export default OnChainTransparency
