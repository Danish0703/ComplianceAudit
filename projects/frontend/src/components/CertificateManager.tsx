import React, { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { complianceService, Certificate, CompliancePermissions } from '../services/complianceService'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface CertificateMgrProps {
  refreshInterval?: number
}

const CertificateManager: React.FC<CertificateMgrProps> = ({ refreshInterval = 10000 }) => {
  const { activeAddress, transactionSigner } = useWallet()
  const algodConfig = getAlgodConfigFromViteEnvironment()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [lastTxId, setLastTxId] = useState<string>('')
  const [balanceAlgo, setBalanceAlgo] = useState<number | null>(null)
  const [balanceCheckedAt, setBalanceCheckedAt] = useState<number | null>(null)
  const [failingAccount, setFailingAccount] = useState<string>('')
  const [fundingApp, setFundingApp] = useState(false)
  const [permissions, setPermissions] = useState<CompliancePermissions | null>(null)
  const [formData, setFormData] = useState({
    metadata: '',
    expiryDays: '365',
  })

  const explorerNetwork = React.useMemo(() => {
    const network = (algodConfig.network || '').toLowerCase()
    if (network.includes('test')) return 'testnet'
    if (network.includes('main')) return 'mainnet'
    return 'localnet'
  }, [algodConfig.network])

  const explorerBase = React.useMemo(() => `https://lora.algokit.io/${explorerNetwork}`, [explorerNetwork])

  // Fetch certificates from backend
  const fetchCertificates = async () => {
    if (!activeAddress) return

    setLoading(true)
    try {
      const list = await complianceService.getCertificates(activeAddress)
      setCertificates(list)
      setError('')
    } catch (err) {
      setError(`Error fetching certificates: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Create new certificate
  const handleCreateCertificate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAddress || !formData.metadata) return
    if (!permissions?.isCertificateManagerCreator) {
      setError('Connected wallet is not the CertificateManager creator. Issuance is admin-only on-chain.')
      return
    }

    setCreating(true)
    try {
      setFailingAccount('')
      const expiryDays = Number.parseInt(formData.expiryDays, 10)
      const expiresIn = Math.max(1, expiryDays) * 24 * 60 * 60 * 1000
      const newCert = await complianceService.issueCertificate(
        activeAddress,
        activeAddress,
        expiresIn,
        formData.metadata,
        transactionSigner,
      )
      setLastTxId(newCert.txId || '')
      setCertificates([newCert, ...certificates])
      setFormData({ metadata: '', expiryDays: '365' })
      setError('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      const match = message.match(/account\s+([A-Z2-7]{58})\s+balance\s+0\s+below\s+min/i)
      if (match?.[1]) {
        const failing = match[1]
        setFailingAccount(failing)
        const suffix =
          activeAddress && failing !== activeAddress
            ? ` The failing account is ${failing}.`
            : ` The failing account is your signing wallet (${failing}). Please ensure Pera is connected to the funded account, then refresh balance below.`
        setError(`Failed to create certificate: ${message}${suffix}`)
      } else {
        setError(`Failed to create certificate: ${message}`)
      }
    } finally {
      setCreating(false)
    }
  }

  const certificateAppId = Number(import.meta.env.VITE_CERTIFICATE_MANAGER_APP_ID || 0)
  const certificateAppAddress = complianceService.getAppAddress(certificateAppId)
  const isAppMbrIssue = Boolean(failingAccount && certificateAppAddress && failingAccount === certificateAppAddress)

  const fundCertificateApp = async () => {
    if (!activeAddress || !certificateAppId) return
    setFundingApp(true)
    setError('')
    try {
      // Default funding for box MBR + fees buffer.
      const result = await complianceService.fundAppAccount(activeAddress, certificateAppId, 400_000, transactionSigner)
      setLastTxId(result.txId || '')
      await refreshBalance()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fund app account')
    } finally {
      setFundingApp(false)
    }
  }

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!activeAddress) {
        setPermissions(null)
        return
      }
      try {
        const nextPermissions = await complianceService.getPermissions(activeAddress)
        setPermissions(nextPermissions)
      } catch {
        setPermissions(null)
      }
    }

    fetchPermissions()
    fetchCertificates()
    const interval = setInterval(fetchCertificates, refreshInterval)
    return () => clearInterval(interval)
  }, [activeAddress, refreshInterval])

  useEffect(() => {
    const loadFunding = async () => {
      if (!activeAddress) {
        setBalanceAlgo(null)
        setBalanceCheckedAt(null)
        return
      }
      try {
        const funding = await complianceService.getFundingStatus(activeAddress)
        setBalanceAlgo(funding.algos)
        setBalanceCheckedAt(Date.now())
      } catch {
        setBalanceAlgo(null)
        setBalanceCheckedAt(null)
      }
    }
    void loadFunding()
  }, [activeAddress])

  const refreshBalance = async () => {
    if (!activeAddress) return
    try {
      const funding = await complianceService.getFundingStatus(activeAddress)
      setBalanceAlgo(funding.algos)
      setBalanceCheckedAt(Date.now())
    } catch {
      setBalanceAlgo(null)
      setBalanceCheckedAt(null)
    }
  }

  const canIssueCertificate = Boolean(activeAddress && permissions?.isCertificateManagerCreator)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'revoked':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const getDaysUntilExpiry = (expiresAt: number) => {
    const today = Date.now()
    const daysLeft = Math.ceil((expiresAt - today) / 86400000)
    return daysLeft
  }

  const getExpiryWarning = (expiresAt: number) => {
    const daysLeft = getDaysUntilExpiry(expiresAt)
    if (daysLeft < 0) return { icon: '❌', text: 'Expired', color: 'text-red-600' }
    if (daysLeft < 30) return { icon: '⚠️', text: `${daysLeft} days left`, color: 'text-orange-600' }
    if (daysLeft < 90) return { icon: '⏰', text: `${daysLeft} days left`, color: 'text-yellow-600' }
    return { icon: '✅', text: 'Valid', color: 'text-green-600' }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Certificate Manager</h2>
            <p className="mt-2 text-sm text-slate-600">
              Issue and verify compliance certificates anchored to the `CertificateManager` contract.
            </p>
          </div>
          {lastTxId && (
            <a
              href={`${explorerBase}/transaction/${lastTxId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              View last issuance tx
            </a>
          )}
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {isAppMbrIssue && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">CertificateManager app account needs funding</p>
            <p className="mt-1 text-xs text-amber-900/80">
              The failing account matches the CertificateManager **application address**. Fund the app account once to cover minimum balance
              requirements for box storage.
            </p>
            <p className="mt-2 font-mono text-xs text-amber-950">{certificateAppAddress}</p>
            <button
              type="button"
              onClick={fundCertificateApp}
              disabled={fundingApp}
              className="mt-3 rounded-lg bg-amber-200 px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-300 disabled:opacity-60"
            >
              {fundingApp ? 'Funding app…' : 'Fund app account (0.4 ALGO)'}
            </button>
          </div>
        )}
        {activeAddress && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Signing wallet</p>
            <p className="mt-1 font-mono text-xs text-slate-800">{activeAddress}</p>
            {balanceAlgo !== null && (
              <p className="mt-2 text-xs text-slate-700">
                Balance: <span className="font-semibold">{balanceAlgo.toFixed(6)} ALGO</span>
                {balanceCheckedAt ? ` (checked ${new Date(balanceCheckedAt).toLocaleTimeString()})` : ''}
              </p>
            )}
            <button
              type="button"
              onClick={refreshBalance}
              className="mt-3 rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-300"
            >
              Refresh balance
            </button>
          </div>
        )}
        {activeAddress && balanceAlgo !== null && balanceAlgo <= 0.1 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Wallet funding required</p>
            <p className="mt-1 text-xs text-amber-900/80">
              Connected wallet: <span className="font-mono">{activeAddress}</span>
            </p>
            <p className="mt-1 text-xs text-amber-900/80">
              Balance: ~{balanceAlgo.toFixed(6)} ALGO on TestNet. Fund it via the dispenser, then retry.
            </p>
            <p className="mt-2 text-xs font-semibold">
              Dispenser: <span className="font-mono">https://bank.testnet.algorand.network/</span>
            </p>
            <p className="mt-2 text-xs text-amber-900/80">After funding, click “Refresh balance” above.</p>
          </div>
        )}

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          {!canIssueCertificate && activeAddress && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Certificate issuance is restricted to the CertificateManager creator wallet for this app.
            </div>
          )}
          <form onSubmit={handleCreateCertificate} className="space-y-4">
            <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">Issue certificate</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Metadata/Hash</label>
                <input
                  type="text"
                  value={formData.metadata}
                  onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                  disabled={!canIssueCertificate || creating}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                  placeholder="e.g., compliance_badge_v1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Expiry (Days)</label>
                <input
                  type="number"
                  value={formData.expiryDays}
                  onChange={(e) => setFormData({ ...formData, expiryDays: e.target.value })}
                  disabled={!canIssueCertificate || creating}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                  min="1"
                  max="3650"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!canIssueCertificate || creating || !formData.metadata}
              className="w-full rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {creating ? 'Issuing...' : 'Issue Certificate'}
            </button>
          </form>
        </div>
      </div>

      {/* Certificates List */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Issued certificates</h3>

        {loading && certificates.length === 0 ? (
          <div className="text-center p-8 text-slate-500">Loading certificates...</div>
        ) : certificates.length === 0 ? (
          <div className="text-center p-8 text-slate-500">No certificates issued yet</div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 border-b">
                  <th className="p-3 text-left">Certificate ID</th>
                  <th className="p-3 text-left">Metadata</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Issued</th>
                  <th className="p-3 text-right">Expires</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => {
                  const expiryInfo = getExpiryWarning(cert.expiresAt)
                  return (
                    <tr key={cert.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs">{cert.id.slice(0, 12)}...</td>
                      <td className="p-3 text-slate-700">{String(cert.metadata?.hash ?? '').substring(0, 30)}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(cert.status)}`}>
                          {cert.status}
                        </span>
                      </td>
                      <td className="p-3 text-right text-xs text-slate-600">{new Date(cert.issuedAt).toLocaleDateString()}</td>
                      <td className={`p-3 text-right font-medium ${expiryInfo.color}`}>
                        <span>
                          {expiryInfo.icon} {expiryInfo.text}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Certificate Info */}
    </div>
  )
}

export default CertificateManager
