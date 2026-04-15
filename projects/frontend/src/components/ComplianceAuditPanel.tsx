import React, { useEffect, useMemo, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import {
  complianceService,
  CompliancePermissions,
  ComplianceReport,
  OrganizationVerification,
  WalletAuditMetrics,
} from '../services/complianceService'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

const ComplianceAuditPanel: React.FC = () => {
  const { activeAddress, transactionSigner } = useWallet()
  const algodConfig = getAlgodConfigFromViteEnvironment()
  const [permissions, setPermissions] = useState<CompliancePermissions | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [lastTxId, setLastTxId] = useState<string>('')
  const [lastActionLabel, setLastActionLabel] = useState<string>('')
  const [balanceAlgo, setBalanceAlgo] = useState<number | null>(null)
  const [balanceCheckedAt, setBalanceCheckedAt] = useState<number | null>(null)

  const [consentWallet, setConsentWallet] = useState<string>('')
  const [consentValue, setConsentValue] = useState<boolean>(true)
  const [consentStatus, setConsentStatus] = useState<boolean | null>(null)

  const [metricsWallet, setMetricsWallet] = useState<string>('')
  const [metrics, setMetrics] = useState<WalletAuditMetrics | null>(null)

  const [assessmentWallet, setAssessmentWallet] = useState<string>('')
  const [assessmentRiskScore, setAssessmentRiskScore] = useState<string>('65')
  const [assessmentSuspicious, setAssessmentSuspicious] = useState<boolean>(true)
  const [assessmentReason, setAssessmentReason] = useState<string>('Unusual transfer pattern')
  const [assessmentTxReference, setAssessmentTxReference] = useState<string>('tx-ref-001')
  const [assessmentEvidenceHash, setAssessmentEvidenceHash] = useState<string>('')

  const [reportPeriod, setReportPeriod] = useState<string>('Q1-2026')
  const [reportHash, setReportHash] = useState<string>('')
  const [reportTotal, setReportTotal] = useState<string>('0')
  const [reportSuspicious, setReportSuspicious] = useState<string>('0')
  const [reportIdLookup, setReportIdLookup] = useState<string>('1')
  const [loadedReport, setLoadedReport] = useState<ComplianceReport | null>(null)

  const [orgWallet, setOrgWallet] = useState<string>('')
  const [orgAssetId, setOrgAssetId] = useState<string>('')
  const [orgLookupWallet, setOrgLookupWallet] = useState<string>('')
  const [orgVerification, setOrgVerification] = useState<OrganizationVerification | null>(null)

  useEffect(() => {
    const baseWallet = activeAddress || ''
    setConsentWallet((prev) => prev || baseWallet)
    setMetricsWallet((prev) => prev || baseWallet)
    setAssessmentWallet((prev) => prev || baseWallet)
    setOrgWallet((prev) => prev || baseWallet)
    setOrgLookupWallet((prev) => prev || baseWallet)
  }, [activeAddress])

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

  const explorerNetwork = useMemo(() => {
    const network = (algodConfig.network || '').toLowerCase()
    if (network.includes('test')) return 'testnet'
    if (network.includes('main')) return 'mainnet'
    return 'localnet'
  }, [algodConfig.network])

  const explorerBase = useMemo(() => `https://lora.algokit.io/${explorerNetwork}`, [explorerNetwork])

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

    void fetchPermissions()
  }, [activeAddress])

  const canWriteAudit = useMemo(() => Boolean(activeAddress && permissions?.isComplianceAuditCreator), [activeAddress, permissions])

  const runAction = async (action: () => Promise<void>) => {
    setLoading(true)
    setError('')
    setLastTxId('')
    setLastActionLabel('')
    try {
      await action()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      const match = message.match(/account\s+([A-Z2-7]{58})\s+balance\s+0\s+below\s+min/i)
      if (match?.[1]) {
        const failing = match[1]
        const suffix =
          activeAddress && failing !== activeAddress
            ? ` The failing account is ${failing}. This usually means you entered an unfunded target wallet address in a form field (DPDP consent / assessment / org wallet).`
            : ` The failing account is your signing wallet (${failing}). Please ensure you are connected to the funded wallet in Pera (or refresh the balance below).`
        setError(`${message}${suffix}`)
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const recordTx = (label: string, txId?: string) => {
    setLastActionLabel(label)
    setLastTxId(txId || '')
  }

  const refreshConsent = async () => {
    if (!consentWallet) return
    await runAction(async () => {
      const hasConsent = await complianceService.hasDpdpConsent(consentWallet)
      setConsentStatus(hasConsent)
      setConsentValue(hasConsent)
    })
  }

  const saveConsent = async () => {
    if (!consentWallet || !activeAddress) return
    await runAction(async () => {
      // If user sets consent for a different wallet, that address must exist on-chain (be funded at least once).
      if (consentWallet !== activeAddress) {
        const targetFunding = await complianceService.getFundingStatus(consentWallet)
        if (targetFunding.microAlgos <= 0) {
          throw new Error(
            `Target wallet does not exist on-chain yet (0 ALGO). Fund ${consentWallet} on TestNet or set consent for your connected wallet instead.`,
          )
        }
      }
      const result = await complianceService.setDpdpConsent(activeAddress, consentWallet, consentValue, transactionSigner)
      recordTx('DPDP consent updated', result.txId)
      const hasConsent = await complianceService.hasDpdpConsent(consentWallet)
      setConsentStatus(hasConsent)
    })
  }

  const loadMetrics = async () => {
    if (!metricsWallet) return
    await runAction(async () => {
      const nextMetrics = await complianceService.getWalletAuditMetrics(metricsWallet)
      setMetrics(nextMetrics)
    })
  }

  const submitAssessment = async () => {
    if (!activeAddress || !assessmentWallet) return
    if (!canWriteAudit) {
      setError('Only the ComplianceAudit creator can record transaction assessments.')
      return
    }

    await runAction(async () => {
      if (assessmentWallet !== activeAddress) {
        const targetFunding = await complianceService.getFundingStatus(assessmentWallet)
        if (targetFunding.microAlgos <= 0) {
          throw new Error(
            `Assessment wallet does not exist on-chain yet (0 ALGO). Fund ${assessmentWallet} on TestNet or use your connected wallet.`,
          )
        }
      }
      const result = await complianceService.recordTransactionAssessment(
        activeAddress,
        assessmentWallet,
        Number(assessmentRiskScore || 0),
        assessmentSuspicious,
        assessmentReason,
        assessmentTxReference,
        assessmentEvidenceHash,
        transactionSigner,
      )
      recordTx('Assessment recorded', result.txId)
      const refreshed = await complianceService.getWalletAuditMetrics(assessmentWallet)
      setMetrics(refreshed)
      setMetricsWallet(assessmentWallet)
    })
  }

  const submitReport = async () => {
    if (!activeAddress) return
    if (!canWriteAudit) {
      setError('Only the ComplianceAudit creator can submit compliance reports.')
      return
    }

    await runAction(async () => {
      const { reportId, txId } = await complianceService.submitComplianceReport(
        activeAddress,
        reportPeriod,
        reportHash,
        Number(reportTotal || 0),
        Number(reportSuspicious || 0),
        transactionSigner,
      )
      recordTx('Compliance report submitted', txId)
      setReportIdLookup(String(reportId))
      const report = await complianceService.getComplianceReport(reportId, activeAddress)
      setLoadedReport(report)
    })
  }

  const loadReport = async () => {
    if (!reportIdLookup) return
    await runAction(async () => {
      const report = await complianceService.getComplianceReport(Number(reportIdLookup), activeAddress || undefined)
      setLoadedReport(report)
    })
  }

  const registerOrganization = async () => {
    if (!activeAddress || !orgWallet) return
    if (!canWriteAudit) {
      setError('Only the ComplianceAudit creator can register organizations.')
      return
    }

    await runAction(async () => {
      if (orgWallet !== activeAddress) {
        const targetFunding = await complianceService.getFundingStatus(orgWallet)
        if (targetFunding.microAlgos <= 0) {
          throw new Error(
            `Organization wallet does not exist on-chain yet (0 ALGO). Fund ${orgWallet} on TestNet or use an existing wallet address.`,
          )
        }
      }
      const result = await complianceService.registerVerifiedOrganization(
        activeAddress,
        orgWallet,
        Number(orgAssetId || 0),
        transactionSigner,
      )
      recordTx('Organization registered', result.txId)
      const verification = await complianceService.getOrganizationVerification(orgWallet, activeAddress)
      setOrgVerification(verification)
      setOrgLookupWallet(orgWallet)
    })
  }

  const revokeOrganization = async () => {
    if (!activeAddress || !orgWallet) return
    if (!canWriteAudit) {
      setError('Only the ComplianceAudit creator can revoke organizations.')
      return
    }

    await runAction(async () => {
      const result = await complianceService.revokeVerifiedOrganization(activeAddress, orgWallet, transactionSigner)
      recordTx('Organization revoked', result.txId)
      const verification = await complianceService.getOrganizationVerification(orgWallet, activeAddress)
      setOrgVerification(verification)
      setOrgLookupWallet(orgWallet)
    })
  }

  const lookupOrganization = async () => {
    if (!orgLookupWallet) return
    await runAction(async () => {
      const verification = await complianceService.getOrganizationVerification(orgLookupWallet, activeAddress || undefined)
      setOrgVerification(verification)
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Compliance Audit</h2>
            <p className="mt-2 text-sm text-slate-600">
              Manage consent, evidence-backed assessments, reports, and organization verification directly on-chain.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Write authority</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{canWriteAudit ? 'Creator wallet' : 'Read-only wallet'}</p>
          </div>
        </div>
        {!canWriteAudit && activeAddress && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Creator-only writes are enabled for the ComplianceAudit creator wallet only.
          </div>
        )}
        {error && <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
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
              Balance: ~{balanceAlgo.toFixed(6)} ALGO on TestNet. Fund it via the TestNet dispenser, then retry.
            </p>
            <p className="mt-2 text-xs font-semibold">
              Dispenser: <span className="font-mono">https://bank.testnet.algorand.network/</span>
            </p>
            <p className="mt-2 text-xs text-amber-900/80">After funding, click “Refresh balance” above.</p>
          </div>
        )}
        {lastTxId && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-900">{lastActionLabel || 'Transaction confirmed'}</p>
                <p className="mt-1 font-mono text-xs text-emerald-900/80">{lastTxId}</p>
              </div>
              <a
                href={`${explorerBase}/transaction/${lastTxId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                View on Explorer
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">DPDP Consent</h3>
          <div className="mt-4 space-y-3">
            <input
              value={consentWallet}
              onChange={(e) => setConsentWallet(e.target.value)}
              placeholder="Wallet address"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={consentValue} onChange={(e) => setConsentValue(e.target.checked)} />
              Wallet has granted consent
            </label>
            <div className="flex gap-2">
              <button
                onClick={refreshConsent}
                disabled={loading || !consentWallet}
                className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
              >
                Refresh
              </button>
              <button
                onClick={saveConsent}
                disabled={loading || !consentWallet || !activeAddress}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:bg-slate-400"
              >
                Save Consent
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Current consent status: {consentStatus === null ? 'Unknown' : consentStatus ? 'Granted' : 'Not granted'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Wallet Audit Metrics</h3>
          <div className="mt-4 space-y-3">
            <input
              value={metricsWallet}
              onChange={(e) => setMetricsWallet(e.target.value)}
              placeholder="Wallet address"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <button
              onClick={loadMetrics}
              disabled={loading || !metricsWallet}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:bg-slate-400"
            >
              Load Metrics
            </button>
            {metrics && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transactions</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{metrics.transactionCount}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suspicious</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{metrics.suspiciousCount}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last risk score</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{metrics.lastRiskScore}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last reason</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{metrics.lastReason || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Record Assessment</h3>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <input
              value={assessmentWallet}
              onChange={(e) => setAssessmentWallet(e.target.value)}
              placeholder="Wallet"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <input
              type="number"
              min="0"
              max="100"
              value={assessmentRiskScore}
              onChange={(e) => setAssessmentRiskScore(e.target.value)}
              placeholder="Risk score"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <input
              value={assessmentReason}
              onChange={(e) => setAssessmentReason(e.target.value)}
              placeholder="Reason"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <input
              value={assessmentTxReference}
              onChange={(e) => setAssessmentTxReference(e.target.value)}
              placeholder="Transaction reference"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <input
              value={assessmentEvidenceHash}
              onChange={(e) => setAssessmentEvidenceHash(e.target.value)}
              placeholder="Evidence hash (optional)"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={assessmentSuspicious} onChange={(e) => setAssessmentSuspicious(e.target.checked)} />
              Mark transaction as suspicious
            </label>
            <button
              onClick={submitAssessment}
              disabled={loading || !activeAddress || !canWriteAudit}
              className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:bg-slate-400"
            >
              Record Assessment
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Compliance Reports</h3>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <input
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              placeholder="Period label"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <input
              value={reportHash}
              onChange={(e) => setReportHash(e.target.value)}
              placeholder="Report hash"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                value={reportTotal}
                onChange={(e) => setReportTotal(e.target.value)}
                placeholder="Total tx"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <input
                type="number"
                min="0"
                value={reportSuspicious}
                onChange={(e) => setReportSuspicious(e.target.value)}
                placeholder="Suspicious tx"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <button
              onClick={submitReport}
              disabled={loading || !activeAddress || !canWriteAudit || !reportPeriod || !reportHash}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-400"
            >
              Submit Report
            </button>
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                min="0"
                value={reportIdLookup}
                onChange={(e) => setReportIdLookup(e.target.value)}
                placeholder="Report ID"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <button
                onClick={loadReport}
                disabled={loading || !reportIdLookup}
                className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
              >
                Load
              </button>
            </div>
            {loadedReport && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Report #{loadedReport.id}</p>
                    <p className="text-xs text-slate-600">Period: {loadedReport.periodLabel}</p>
                    <p className="text-xs text-slate-600">Created round: {loadedReport.createdRound}</p>
                  </div>
                  <a
                    href={`${explorerBase}/application/${import.meta.env.VITE_COMPLIANCE_AUDIT_APP_ID || ''}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-teal-700 underline underline-offset-2"
                  >
                    View App on Explorer
                  </a>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{loadedReport.totalTransactions}</p>
                  </div>
                  <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Suspicious</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{loadedReport.suspiciousTransactions}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Organization Verification</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={orgWallet}
            onChange={(e) => setOrgWallet(e.target.value)}
            placeholder="Organization wallet"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <input
            type="number"
            min="1"
            value={orgAssetId}
            onChange={(e) => setOrgAssetId(e.target.value)}
            placeholder="Certificate ASA ID"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <div className="flex gap-2">
            <button
              onClick={registerOrganization}
              disabled={loading || !activeAddress || !canWriteAudit || !orgWallet || !orgAssetId}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:bg-slate-400"
            >
              Register
            </button>
            <button
              onClick={revokeOrganization}
              disabled={loading || !activeAddress || !canWriteAudit || !orgWallet}
              className="w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:bg-slate-400"
            >
              Revoke
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={orgLookupWallet}
            onChange={(e) => setOrgLookupWallet(e.target.value)}
            placeholder="Lookup wallet"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <button
            onClick={lookupOrganization}
            disabled={loading || !orgLookupWallet}
            className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
          >
            Lookup
          </button>
        </div>

        {orgVerification && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-mono text-xs text-slate-700">{orgVerification.wallet}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  orgVerification.isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {orgVerification.isVerified ? 'Verified' : 'Not verified'}
              </span>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
                Certificate ASA ID: {orgVerification.certificateAssetId || 0}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ComplianceAuditPanel
