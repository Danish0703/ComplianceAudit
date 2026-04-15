import React, { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { complianceService } from '../services/complianceService'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface Transaction {
  id: string
  sender: string
  receiver: string
  amount: number
  status: 'approved' | 'flagged' | 'blocked'
  risk_score: number
  timestamp: number
  txId?: string
}

interface TransactionMonitorProps {
  refreshInterval?: number
}

const TransactionMonitor: React.FC<TransactionMonitorProps> = ({ refreshInterval = 5000 }) => {
  const { activeAddress, transactionSigner } = useWallet()
  const algodConfig = getAlgodConfigFromViteEnvironment()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [newAmount, setNewAmount] = useState<string>('1000000')
  const [validating, setValidating] = useState(false)
  const [lastTxId, setLastTxId] = useState<string>('')

  const explorerNetwork = React.useMemo(() => {
    const network = (algodConfig.network || '').toLowerCase()
    if (network.includes('test')) return 'testnet'
    if (network.includes('main')) return 'mainnet'
    return 'localnet'
  }, [algodConfig.network])

  const explorerBase = React.useMemo(() => `https://lora.algokit.io/${explorerNetwork}`, [explorerNetwork])

  // Fetch transactions from backend
  const fetchTransactions = async () => {
    if (!activeAddress) return

    setLoading(true)
    try {
      const data = await complianceService.getTransactions(activeAddress)
      setTransactions(data)
      setError('')
    } catch (err) {
      setError(`Error fetching transactions: ${err instanceof Error ? err.message : 'Unknown error'}`)
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Validate new transaction
  const handleValidateTransaction = async () => {
    if (!activeAddress) {
      setError('Please connect wallet first')
      return
    }

    setValidating(true)
    try {
      const amount = parseInt(newAmount, 10)
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid amount')
        setValidating(false)
        return
      }

      const result = await complianceService.validateTransaction(activeAddress, amount, transactionSigner)
      setLastTxId(result.txId || '')
      setNewAmount('1000000')
      setError('')
      await fetchTransactions()
    } catch (err) {
      setError(`Validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setValidating(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
    const interval = setInterval(fetchTransactions, refreshInterval)
    return () => clearInterval(interval)
  }, [activeAddress, refreshInterval])

  const getRiskColor = (score: number) => {
    if (score <= 25) return 'bg-green-100 text-green-800'
    if (score <= 50) return 'bg-yellow-100 text-yellow-800'
    if (score <= 75) return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'flagged':
        return 'bg-yellow-100 text-yellow-800'
      case 'blocked':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Transaction Monitor</h2>
            <p className="mt-2 text-sm text-slate-600">Validate a sample transaction on-chain and review the indexed history.</p>
          </div>
          {lastTxId && (
            <a
              href={`${explorerBase}/transaction/${lastTxId}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              View last tx on Explorer
            </a>
          )}
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-slate-700">Amount (microAlgo)</label>
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                disabled={!activeAddress || validating}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Enter amount in microAlgo"
              />
            </div>
            <button
              onClick={handleValidateTransaction}
              disabled={!activeAddress || validating || loading}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {validating ? 'Validating...' : 'Validate'}
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300">
              <th className="p-3 text-left text-sm font-semibold text-slate-900">Transaction ID</th>
              <th className="p-3 text-left text-sm font-semibold text-slate-900">Sender</th>
              <th className="p-3 text-left text-sm font-semibold text-slate-900">Receiver</th>
              <th className="p-3 text-right text-sm font-semibold text-slate-900">Amount (ALGO)</th>
              <th className="p-3 text-center text-sm font-semibold text-slate-900">Status</th>
              <th className="p-3 text-right text-sm font-semibold text-slate-900">Risk Score</th>
              <th className="p-3 text-left text-sm font-semibold text-slate-900">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading && transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-slate-500">
                  Loading transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-slate-500">
                  No transactions yet
                </td>
              </tr>
            ) : (
              transactions.map((txn) => (
                <tr key={txn.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono text-xs text-slate-700">
                    {txn.txId ? (
                      <a
                        href={`${explorerBase}/transaction/${txn.txId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-teal-700 underline underline-offset-2"
                      >
                        {txn.txId.slice(0, 16)}...
                      </a>
                    ) : (
                      `${txn.id.slice(0, 16)}...`
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs text-slate-600">{txn.sender.slice(0, 12)}...</td>
                  <td className="p-3 font-mono text-xs text-slate-600">{txn.receiver.slice(0, 12)}...</td>
                  <td className="p-3 text-right text-slate-900 font-medium">{txn.amount.toFixed(6)}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(txn.status)}`}>
                      {txn.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRiskColor(txn.risk_score)}`}>
                      {txn.risk_score}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 text-sm">{new Date(txn.timestamp).toLocaleTimeString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TransactionMonitor
