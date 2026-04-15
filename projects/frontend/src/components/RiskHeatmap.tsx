import React, { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { complianceService, RiskScoreResult } from '../services/complianceService'

interface RiskHeatmapProps {
  refreshInterval?: number
}

const RiskHeatmap: React.FC<RiskHeatmapProps> = ({ refreshInterval = 10000 }) => {
  const { activeAddress, transactionSigner } = useWallet()
  const [riskData, setRiskData] = useState<RiskScoreResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [scoreAmount, setScoreAmount] = useState<string>('1000000')

  // Fetch risk score from backend
  const fetchRiskScore = async (amount?: number) => {
    if (!activeAddress) return

    setLoading(true)
    try {
      const fetchAmount = amount ?? parseInt(scoreAmount, 10)
      if (isNaN(fetchAmount) || fetchAmount <= 0) return

      const result = await complianceService.scoreRisk(activeAddress, fetchAmount, transactionSigner)
      setRiskData(result)
      setError('')
    } catch (err) {
      setError(`Error calculating risk score: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Handle manual score calculation
  const handleCalculateScore = async () => {
    await fetchRiskScore()
  }

  useEffect(() => {
    if (activeAddress) {
      fetchRiskScore()
      const interval = setInterval(() => fetchRiskScore(), refreshInterval)
      return () => clearInterval(interval)
    }
    return undefined
  }, [activeAddress, refreshInterval])

  const getRiskClassification = (score: number) => {
    if (score <= 25) return { level: 'Low Risk', color: 'bg-green-500', textColor: 'text-green-900' }
    if (score <= 50) return { level: 'Medium Risk', color: 'bg-yellow-500', textColor: 'text-yellow-900' }
    if (score <= 75) return { level: 'High Risk', color: 'bg-orange-500', textColor: 'text-orange-900' }
    return { level: 'Critical Risk', color: 'bg-red-500', textColor: 'text-red-900' }
  }

  const getRiskBarColor = (score: number) => {
    if (score <= 25) return 'bg-green-500'
    if (score <= 50) return 'bg-yellow-500'
    if (score <= 75) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const ScoreBar = ({ label, score }: { label: string; score: number }) => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-lg font-bold text-slate-900">{score}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
        <div className={`h-full transition-all duration-300 ${getRiskBarColor(score)}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
    </div>
  )

  if (!activeAddress) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-slate-900">Risk Heatmap</h2>
        <div className="text-center p-8 text-slate-500">Please connect a wallet to view risk scores</div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-slate-900">Risk Heatmap</h2>

      {error && <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>}

      {/* Input Section */}
      <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Amount (microAlgo)</label>
            <input
              type="number"
              value={scoreAmount}
              onChange={(e) => setScoreAmount(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              placeholder="Enter amount"
            />
          </div>
          <button
            onClick={handleCalculateScore}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Calculating...' : 'Calculate'}
          </button>
        </div>
      </div>

      {/* Risk Heatmap Display */}
      {riskData && (
        <div className="space-y-6">
          {/* Overall Risk */}
          <div className={`p-6 rounded-lg text-white ${getRiskClassification(riskData.overallRisk).color}`}>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">{riskData.overallRisk}</div>
              <div className="text-xl font-semibold">{getRiskClassification(riskData.overallRisk).level}</div>
              <div className="text-sm mt-2 opacity-90">{riskData.classification}</div>
            </div>
          </div>

          {/* Detailed Risk Components */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-slate-900 mb-4">Risk Components</h3>
              <ScoreBar label="Fraud Score" score={riskData.fraud} />
              <ScoreBar label="Transaction History" score={riskData.history} />
              <ScoreBar label="Violations" score={riskData.violations} />
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-lg text-slate-900 mb-4">Additional Factors</h3>
              <ScoreBar label="Blacklist Score" score={riskData.blacklist} />
              <ScoreBar label="Custom Rules" score={riskData.custom} />
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600 mb-2">Calculation Method</div>
                <div className="text-xs font-mono text-slate-700 space-y-1">
                  <div>• Fraud: 30%</div>
                  <div>• History: 25%</div>
                  <div>• Violations: 20%</div>
                  <div>• Blacklist: 15%</div>
                  <div>• Custom: 10%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Recommendation */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-semibold text-slate-900 mb-2">Recommendation</h4>
            <p className="text-slate-700">
              {riskData.overallRisk <= 25
                ? '✅ This transaction appears safe to process. Standard compliance checks apply.'
                : riskData.overallRisk <= 50
                  ? '⚠️ This transaction warrants additional review. Consider requesting additional information.'
                  : riskData.overallRisk <= 75
                    ? '🔶 This transaction is flagged as high-risk. Manual approval recommended.'
                    : '🚫 This transaction is classified as high-risk and should be blocked pending investigation.'}
            </p>
          </div>

          {/* Timestamp */}
          <div className="text-right text-xs text-slate-500">Last updated: {new Date().toLocaleTimeString()}</div>
        </div>
      )}

      {loading && !riskData && (
        <div className="text-center p-8 text-slate-500">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-400 border-t-blue-600 rounded-full mb-4" />
          <div>Calculating risk score...</div>
        </div>
      )}
    </div>
  )
}

export default RiskHeatmap
