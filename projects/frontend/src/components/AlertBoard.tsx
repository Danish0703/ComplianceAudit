import React, { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { complianceService, Alert, CompliancePermissions } from '../services/complianceService'

interface AlertBoardProps {
  refreshInterval?: number
}

const AlertBoard: React.FC<AlertBoardProps> = ({ refreshInterval = 5000 }) => {
  const { activeAddress, transactionSigner } = useWallet()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [permissions, setPermissions] = useState<CompliancePermissions | null>(null)
  const [balanceAlgo, setBalanceAlgo] = useState<number | null>(null)
  const [balanceCheckedAt, setBalanceCheckedAt] = useState<number | null>(null)
  const [failingAccount, setFailingAccount] = useState<string>('')
  const [fundingApp, setFundingApp] = useState(false)
  const [formData, setFormData] = useState({
    severity: 'medium',
    message: '',
  })

  // Fetch alerts from backend
  const fetchAlerts = async () => {
    if (!activeAddress) return

    setLoading(true)
    try {
      const data = await complianceService.getAlerts(activeAddress)
      setAlerts(data)
      setError('')
    } catch (err) {
      setError(`Error fetching alerts: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Create new alert
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAddress || !formData.message) return
    if (!permissions?.isAlertEngineCreator) {
      setError('Connected wallet is not the AlertEngine creator. Alert emission is admin-only on-chain.')
      return
    }

    setCreating(true)
    try {
      setFailingAccount('')
      const newAlert = await complianceService.createAlert(activeAddress, formData.severity, formData.message, transactionSigner)
      setAlerts([newAlert, ...alerts])
      setFormData({ severity: 'medium', message: '' })
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
        setError(`Failed to create alert: ${message}${suffix}`)
      } else {
        setError(`Failed to create alert: ${message}`)
      }
    } finally {
      setCreating(false)
    }
  }

  const alertEngineAppId = Number(import.meta.env.VITE_ALERT_ENGINE_APP_ID || 0)
  const alertEngineAppAddress = complianceService.getAppAddress(alertEngineAppId)
  const isAppMbrIssue = Boolean(failingAccount && alertEngineAppAddress && failingAccount === alertEngineAppAddress)

  const fundAlertEngineApp = async () => {
    if (!activeAddress || !alertEngineAppId) return
    setFundingApp(true)
    setError('')
    try {
      const result = await complianceService.fundAppAccount(activeAddress, alertEngineAppId, 400_000, transactionSigner)
      // keep error cleared, refresh balance
      await refreshBalance()
      // show tx in UI list by adding a synthetic message would violate indexer-only;
      // so rely on the explorer link by leaving it in error-free state.
      if (result.txId) {
        setError(`AlertEngine app funded. TxID: ${result.txId}`)
      }
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
    fetchAlerts()
    const interval = setInterval(fetchAlerts, refreshInterval)
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

  const canCreateAlert = Boolean(activeAddress && permissions?.isAlertEngineCreator)

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return null
      case 'high':
        return null
      case 'medium':
        return null
      case 'low':
        return null
      default:
        return null
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-4 border-red-500 bg-red-50'
      case 'high':
        return 'border-l-4 border-orange-500 bg-orange-50'
      case 'medium':
        return 'border-l-4 border-yellow-500 bg-yellow-50'
      case 'low':
        return 'border-l-4 border-green-500 bg-green-50'
      default:
        return 'border-l-4 border-gray-500 bg-gray-50'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'acknowledged':
        return 'bg-blue-100 text-blue-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Alert Board</h2>
        <p className="mt-2 text-sm text-slate-600">Create and review on-chain alerts produced by the `AlertEngine` contract.</p>

        {error && <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {isAppMbrIssue && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">AlertEngine app account needs funding</p>
            <p className="mt-1 text-xs text-amber-900/80">
              The failing account matches the AlertEngine **application address**. Fund the app account once to cover minimum balance
              requirements for box storage.
            </p>
            <p className="mt-2 font-mono text-xs text-amber-950">{alertEngineAppAddress}</p>
            <button
              type="button"
              onClick={fundAlertEngineApp}
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
          {!canCreateAlert && activeAddress && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Alert creation is restricted to the AlertEngine creator wallet for this app.
            </div>
          )}
          <form onSubmit={handleCreateAlert} className="space-y-4">
            <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500">Create alert</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Severity</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  disabled={!canCreateAlert || creating}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={!canCreateAlert || creating || !formData.message}
                  className="w-full rounded-lg bg-slate-900 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {creating ? 'Creating...' : 'Create Alert'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                disabled={!canCreateAlert || creating}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                placeholder="Enter alert message"
                rows={3}
              />
            </div>
          </form>
        </div>
      </div>

      {/* Alerts List */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Recent alerts</h3>

        {loading && alerts.length === 0 ? (
          <div className="text-center p-8 text-slate-500">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center p-8 text-slate-500">No alerts yet</div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className={`p-4 rounded-lg ${getSeverityColor(alert.severity)}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900 capitalize">{alert.severity} Alert</h4>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeColor(alert.status)}`}>
                      {alert.status}
                    </span>
                  </div>
                  <p className="text-slate-700 break-words">{alert.message}</p>
                  <div className="flex gap-4 mt-2 text-xs text-slate-600">
                    <span>ID: {alert.id.slice(0, 12)}...</span>
                    <span>Wallet: {alert.wallet.slice(0, 10)}...</span>
                    <span>{new Date(alert.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default AlertBoard
